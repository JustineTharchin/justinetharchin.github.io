const blake = require('blakejs');

// Extracts the duration of the next media and the forbidden medias (current,
// next and next-next) from a synca1000 eventloop.
function parseEventloopNext(eventloop) {
  if (eventloop.length < 2) {
    throw new Error('Synca1000 eventloop is too small');
  }
  let duration = eventloop[1][1];
  let forbidden = [];
  if (eventloop.length >= 3) {
    eventloop.slice(0, 3).forEach(function(item) {
      let syncid = item[0];
      if (syncid.length > 4) {
        // from kdanse: the length of syncid should be a multiple of 4. When it
        // isn't, additional characters have been appended to uniquify it, so
        // they must be removed.
        let rem = syncid.length % 4;
        if (rem > 0) {
          syncid = syncid.slice(0, -rem)
        }
      }
      forbidden.push(syncid);
    })
  }
  return {
    forbidden: forbidden,
    duration: duration
  }
}

// Extracts the sequence for `now` from the playlist.
//
// The "playlist" parameter is not the full json playlist but the playlist
// object inside the json.
function getSequenceAt(playlist, now) {
  let refday = new Date(`${playlist.referenceDay}T00:00`);
  let delta = Math.floor((now - refday) / (24 * 3600 * 1000));
  if (delta < 0) {
    throw new Error('Reference day is in the future: ' + playlist.referenceDay);
  }
  if (playlist.days.length === 0) {
    return [];
  }
  let today = playlist.days[delta % playlist.days.length];
  today.sort((a, b) => (a.begin > b.begin) ? 1 : -1)
  let sequence = [];
  today.some(function(daypart) {
    // It is not possible to get a "reliable" time string from a Date, so build
    // a Date and set its time
    let begin = new Date(now);
    begin.setHours(daypart.begin.substring(0, 2), daypart.begin.substring(3, 5), 0, 0);
    let end = new Date(now);
    // setHours(24) on day gives next day at midnight
    end.setHours(daypart.end.substring(0, 2), daypart.end.substring(3, 5), 0, 0);
    if (now >= begin && now < end) {
      sequence = daypart.sequence;
      return true;
    }
    return false;
  });
  return sequence;
}

// Extracts the current sequence, builds the syncids and gets the mediaVariants
// from a v3 playlist.
//
// The "playlist" parameter is not the full json playlist but the playlist
// object inside the json.
function parsePlaylistV3(playlist) {
  let now = new Date();
  let sequence = getSequenceAt(playlist, now);
  // generate id of each sequence
  let syncids = {};
  const encoder = new TextEncoder();
  sequence.forEach(function(item) {
    // In v3, all variants should have the same idSynchro
    let idsync = ''
    if (playlist.mediaVariants[item[0]].idSynchro) {
      idsync = playlist.mediaVariants[item[0]].idSynchro;
    } else {
      idsync = blake.blake2bHex(encoder.encode(item.sort().concat()), false, 8);
    }
    syncids[idsync] = item;
  })

  return {
    syncids: syncids,
    variants: playlist.mediaVariants,
  }
}

// Extracts the current sequence, builds the syncids and gets the mediaVariants
// from a v4 playlist.
//
// The "playlist" parameter is not the full json playlist but the playlist
// object inside the json.
function parsePlaylistV4(playlist) {
  let now = new Date();
  let sequence = getSequenceAt(playlist, now);
  // generate id of each sequence
  let syncids = {};
  const encoder = new TextEncoder();
  sequence.forEach((item, pos) => {
    // In v4, each media variant is taken into account once
    let ids = new Set();
    item.forEach((v) => {
      let idsync = '';
      if ('idSynchro' in playlist.mediaVariants[v]) {
        idsync = playlist.mediaVariants[v].idSynchro;
      }
      if (!idsync) {
        idsync = v;
      }
      ids.add(idsync);
    });
    // regardless of its position and possible repetition
    let idtxt = [...ids].sort().join('');
    // Appends the index to differentiate `[[m0, m1], [m1, m0]]`
    syncids[blake.blake2bHex(`${idtxt}#${pos}`, false, 8)] = item;
  });

  return {
    syncids: syncids,
    variants: playlist.mediaVariants,
  }
}

// Extracts the current sequence, builds the syncids and gets the mediaVariants
// from a v4.1 playlist.
//
// The "playlist" parameter is not the full json playlist but the playlist
// object inside the json.
function parsePlaylistV41(playlist) {
  let now = new Date();
  let sequence = getSequenceAt(playlist, now);
  // expand each media
  let syncids = {};
  sequence.forEach((m) => {
    syncids[m] = playlist.medias[m];
  });

  return {
    syncids: syncids,
    variants: playlist.mediaVariants,
  }
}

// Returns whether the variant's conditions are satisfied by the conditions
// currently set on the player
function satisfyConditions(variant, synca1000) {
  // mediaVariant without restrictions
  if (!variant || variant.length == 0) return true;
  // player without conditions
  if (!synca1000 || synca1000.length == 0) return false;
  // Outermost array is OR, so interrupt on True
  return variant.some(function(oritem) {
    // Innermost array is AND, so interrupt on False
    return oritem.every(function(restriction) {
      if (typeof restriction === 'string' || restriction instanceof String) {
        if (restriction.startsWith('!')) {
          return !(restriction.slice(1) in synca1000);
        } else {
          return (restriction in synca1000);
        }
      } else {
        let name = Object.keys(restriction)[0];
        let value = restriction[name];
        if (value && value.startsWith('!')) {
          return (!(name in synca1000) || (name in synca1000 && synca1000[name].value !== value.slice(1)));
        } else {
          return (name in synca1000 && synca1000[name].value === value);
        }
      }
    });
  });
}

/*
// Returns a list of suitable mediaVariants from a synca1000 eventloop and a playlist.
function getSuitableMediaVariants(synca1000, playlist, conditions) {
  // remove before/current/after content from sequences.
  let candidates = playlist.syncids;
  synca1000.forbidden.forEach(function(item) {
    delete candidates[item];
  })

  //List all media possibilities
  let suitable = [];
  Object.entries(candidates).forEach(([key, value]) => {
    value.forEach(function(item) {
      let m = playlist.variants[item];
      let now = Math.floor(Date.now() / 1000);
      // Some fields are differently named in v3
      let popId = 'id' in m ? m.id : m.popId;
      let uri = 'name' in m ? m.name : m.uri;
      let restrictions = 'conditions' in m ? m.conditions : null;
      let activated = 'activationTs' in m ? m.activationTs <= now : true;
      activated = activated && ('deactivationTs' in m ? m.deactivationTs > now : true);
      if (activated && (m.duration == synca1000.duration) && uri &&
         satisfyConditions(restrictions, conditions) &&
         !uri.startsWith('http://') && !uri.startsWith('https://') &&
         (uri.split('.').pop().toLowerCase() != 'html')) {
        let itemData = {
          jcddms_fillercreativeid: popId,
          path: `/${uri}`,
          jcddms_fillerreservationid: m.reservationId,
          jcddms_fillerduration: m.duration
        };
        suitable.push(itemData);
      }
    })
  })

  return Array.from(new Set(suitable));
}

function getSixSuitableMediaVariantsAFFB(playlist) {
  const mediaVariants = playlist.mediaVariants;
  const medias = Object.keys(mediaVariants)
    .filter(key => mediaVariants[key].originName.startsWith("AF-FB_"))
    .map(key => ({ id: key, ...mediaVariants[key] }))
    .slice(0, 6);

  console.table(medias);
  console.log('ICIIIIIIIIIIIIIIIIIIIIIIIIIIIIII', medias);
}

function getSixSuitableMediaVariantsAFFB() {
  const mediaList = daysv41.playlist.mediaVariants;
  
  // Filtrer les médias selon les critères donnés
  const filteredMedia = Object.values(mediaList).filter(media => {
    return (
      media.duration === 2 && // Même durée
      media.originName.startsWith("AF-FB_") // Nom de fichier commence par "AF-FB_"
    );
  });

  // Si aucun média ne correspond aux critères, utiliser la fonction de base
  if (filteredMedia.length === 0) {
    // TODO: Fonction de base
    return;
  }

  // Trier les médias filtrés par ordre alphabétique
  const sortedMedia = filteredMedia.sort((a, b) =>
    a.originName.localeCompare(b.originName)
  );

  // Récupérer la dizaine de secondes actuelle
  const currentDate = new Date();
  const currentSecond = Math.floor(currentDate.getSeconds() / 10) * 10;

  // Trouver le média prioritaire (celui qui sera affiché en premier)
  const priorityMedia = sortedMedia.find(media => {
    const mediaDate = new Date(media.reservationId);
    const mediaSecond = Math.floor(mediaDate.getSeconds() / 10) * 10;
    return mediaSecond === currentSecond;
  });

  // Déplacer le média prioritaire en première position du tableau
  const priorityIndex = sortedMedia.indexOf(priorityMedia);
  if (priorityIndex > 0) {
    sortedMedia.splice(priorityIndex, 1);
    sortedMedia.unshift(priorityMedia);
  }

  // Renvoyer les données des 6 médias triés
  return sortedMedia.slice(0, 6);
}
*/

function getSuitableMediaVariants(candidates, playlist) {
  let suitable = [];
  Object.entries(candidates).forEach(([key, value]) => {
    value.forEach(function(item) {
      let m = playlist.variants[item];
      let now = Math.floor(Date.now() / 1000);
      let media = 'originName' in m ? m.originName : m.media;
      let popId = 'id' in m ? m.id : m.popId;
      let uri = 'name' in m ? m.name : m.uri;
      let restrictions = 'conditions' in m ? m.conditions : null;
      let activated = 'activationTs' in m ? m.activationTs <= now : true;
      activated = activated && ('deactivationTs' in m ? m.deactivationTs > now : true);
      if (activated && (m.duration == synca1000.duration) && uri &&
         satisfyConditions(restrictions, conditions) &&
         !uri.startsWith('http://') && !uri.startsWith('https://') &&
         (uri.split('.').pop().toLowerCase() != 'html') &&
         media.startsWith('AF-FB_')) {
        let itemData = {
          jcddms_fillercreativeid: popId,
          path: `/${uri}`,
          jcddms_fillerreservationid: m.reservationId,
          jcddms_fillerduration: m.duration,
          originName: m.originName
        };
        suitable.push(itemData);
      }
    })
  })
  console.log(playlist.variants);
console.log(item);
  console.log('ICIIIIIIIIIIIIIIIIIIIIIIIIIIIIII', suitable);
  suitable.sort((a, b) => a.originName.localeCompare(b.originName));
  return suitable.slice(0, 6);

}


module.exports = {
  parseEventloopNext: parseEventloopNext,
  getSequenceAt: getSequenceAt,
  parsePlaylistV3: parsePlaylistV3,
  parsePlaylistV4: parsePlaylistV4,
  parsePlaylistV41: parsePlaylistV41,
  satisfyConditions: satisfyConditions,
  getSuitableMediaVariants: getSuitableMediaVariants
}
