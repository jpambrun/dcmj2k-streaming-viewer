function getUrlParameter(sParam) {
    'use strict';
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}


function getParameterByName(url, name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(url);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


function parseImageId(imageId) {
    var colonIndex = imageId.indexOf(':');
    var qmarkIndex = imageId.indexOf('?');
    var scheme = imageId.substring(0, colonIndex);
    var url;
    var requestedQuality;

    if (qmarkIndex === -1) {
      url = imageId.substring(colonIndex + 1);
    } else {
      url = imageId.substring(colonIndex + 1, qmarkIndex);
      requestedQuality = getParameterByName(imageId, 'quality');
    }
    return {
      scheme: scheme,
      url: url,
      requestedQuality: Number(requestedQuality),
    };
}
