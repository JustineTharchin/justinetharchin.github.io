//const kdanseApi = require('./kdanse-api.js');
import kdanseApi from './kdanse-api.js';

const playlist_url = '/jcddms_playlist.json';
const eventloop_url = 'http://http.api.player.jcd.local/v1/eventloop';
const conditions_url = 'http://http.api.player.jcd.local/v1/conditions'
const log_url = 'http://trace.player.jcd.local/upload';

const empty = {
  jcddms_fillercreativeid: '',
  path: '',
  jcddms_fillerreservationid: '',
  jcddms_fillerduration: 0
};


function sendLogging(id, level, message) {
  let data = [{
    'id': id,
    'level': level,
    'message': message,
    'timestamp': Date.now()/1000
  }];
  fetch(log_url, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  .catch(() => {
    console.log(message);
  })
}

let p_conditions = fetch(conditions_url).then(response => {
  if (!response.ok) {
    throw new Error('Synca1000 HTTP error: ' + response.status);
  }
  return response.json();
})
.then(result => {
  if (result.status != "success") {
    throw new Error('Synca1000 API error: ' + result.error);
  }
  //sendLogging('DMS_js_filler', 'debug', 'conditions: ' + Object.entries(result.data.conditions));
  return result.data.conditions;
})

// Promise to get the eventloop from synca1000
let p_eventloop = fetch(eventloop_url).then(response => {
  if (!response.ok) {
    throw new Error('Synca1000 HTTP error: ' + response.status);
  }
  return response.json();
})
.then(result => {
  if (result.status != "success") {
    throw new Error('Synca1000 API error: ' + result.error);
  }
  return result.data.eventloop;
})
.then(eventloop => {
  //sendLogging('DMS_js_filler', 'debug', 'eventloop: ' + eventloop);
  return kdanseApi.parseEventloopNext(eventloop);
})

// Promise to get the playlist and build the syncids
let p_playlist = fetch(playlist_url).then(response => {
  if (!response.ok) {
    throw new Error('Playlist HTTP error: ' + response.status);
  }
  return response.json();
})
.then(result => {
  //sendLogging('DMS_js_filler', 'debug', 'version: ' + result.version);
  switch (result.version) {
    case 3:
      return kdanseApi.parsePlaylistV3(result.playlist);
      break;
    case 4:
      return kdanseApi.parsePlaylistV4(result.playlist);
      break;
    case 4.1:
      return kdanseApi.parsePlaylistV41(result.playlist);
      break;
    default:
      throw new Error('Unsupported playlist version: ' + result.version);
  }
})

// Combine both promises to get the medias
let p_medias = Promise.all([p_eventloop, p_playlist, p_conditions]).then(values => {
  return kdanseApi.getSuitableMediaVariants(values[0], values[1], values[2]);
})
.then(medias => {
  // Random return of item in the list
  let m = medias[Math.floor(Math.random() * medias.length)];
  if (typeof m == 'undefined'){
      sendLogging('DMS_js_filler', 'warning', 'No suitable content to return');
      return empty;
  } else {
    sendLogging('DMS_js_filler', 'info', 'Filler content: ' + Object.entries(m));
    return m;
  }
})

// Fallback promise that timeouts after 3s
let p_fallback = new Promise(function(resolve, reject) {
  setTimeout(() => resolve(empty), 3000);
});

// May the fastest win!
Promise.race([p_medias, p_fallback]).then(value => {
  document.jcddms_suitableFillerContent = value;
})
.catch(function(e) {
  document.jcddms_suitableFillerContent = empty;
  sendLogging('DMS_js_filler', 'error', e.message);
})
.finally(() => {
  dispatchEvent(FillerEvent);
});

/*async function getAFBMedia() {
  // Récupérer la liste des médias disponibles
  let medias = await Promise.all([p_playlist]).then(values => {
    return kdanseapi.getSuitableMediaVariants(values[0], values[1], values[2]);
  });

  // Vérifier s'il y a des médias AFFB_
  let afbMedias = medias.filter(media => media.originName.startsWith('AF-FB_')).slice(0, 6);

  // Si aucun média AFB_, utiliser la fonction de base
  if (afbMedias.length == 0) {
    return await Promise.race([p_medias, p_fallback]);
  }

  // Vérifier si tous les médias AFFB_ ont la même durée (à ajouter, parmis les 6 premiers trouvés)
  let sameDuration = afbMedias.every(media => media.duration == afbMedias[0].duration);

  if (sameDuration) {
    // Trier les médias par ordre de priorité (priorité définie par la fonction `compareMediaPriority`: par ordre alphabétique
    // puis par la 10ème de seconde avec
    afbMedias.sort((a, b) => {
      if (a.originName < b.originName) return -1;
      if (a.originName > b.originName) return 1;
      let secondsA = new Date(a.playerTime).getSeconds();
      let secondsB = new Date(b.playerTime).getSeconds();
      if (secondsA < secondsB) return -1;
      if (secondsA > secondsB) return 1;
      return 0;
    });

    // Renvoyer le média avec la plus haute priorité
    return afbMedias[0];
  } else {
    // Si les médias AFB_ n'ont pas la même durée, utiliser la fonction originale
    return await Promise.race([p_medias, p_fallback]);
  }
}
*/
