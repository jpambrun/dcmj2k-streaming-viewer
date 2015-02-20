/*global parseImageId, JpxImage, dicomParser, PDFJS, self, importScripts, XMLHttpRequest, Uint8Array*/
'use strict';
importScripts('jpx.js', 'util.js', 'utils.js', 'arithmetic_decoder.js', 'dicomparser.js');

var jpxImage = new JpxImage();
var prefetchSize = 20000;


self.onmessage = function(e) {
  var loadedLayers;
    var parsedDicomData;
    var jpxData;
    var dlTime;
    var j2kStreamTruncationPoint;
    var xhr;
    var dcmData;
    var newDcmData;
    var deltaDcmData;
    var imageId = e.data.imageId;
    var parsedId = parseImageId(imageId);


    if (e.data.oldDcmData === undefined ) {
      // no data from this image yet.
      console.log('dl data : ' + parsedId.url);

      xhr = new XMLHttpRequest();
      var startDlTime = Date.now();
      xhr.open("GET", parsedId.url, false); // false makes this synchronous
      xhr.setRequestHeader('Range', 'bytes=0-' + (prefetchSize -1)); // the bytes (incl.) you request
      xhr.responseType = 'arraybuffer';
      xhr.send(); // Blocks until response is complete
      if ( !(xhr.status === 200 || xhr.status === 206) ) { // Throw an error if request failed
        throw Error(xhr.status + " " + xhr.statusText + ": " + parsedId.url);
      }

      dcmData = new Uint8Array(xhr.response);
      var dataSet = dicomParser.parseDicom(dcmData);

      var numberOfLayers;
      for (var i =1; i < 3 || dataSet.uint32('x0069101' + (i+1)) !== 0; i++) {
         numberOfLayers = i;
      }
      parsedDicomData = {
        patientName: dataSet.string('x00100020'),
        rescaleIntercept: dataSet.floatString('x00281052'),
        rescaleSlope: dataSet.floatString('x00281053'),
        sliceLocation: dataSet.floatString('x00201041'),
        numberOfLayers: numberOfLayers,
        imageBaseOffset: dataSet.elements.x7fe00010.dataOffset + 16,
        layers: [
          dataSet.uint32('x00691012'),
          dataSet.uint32('x00691013'),
          dataSet.uint32('x00691014')
        ],
      };

      if (dataSet.elements.x00691011 !== undefined) {
        var layerOffset = parsedDicomData.layers[parsedId.requestedQuality - 1];
        j2kStreamTruncationPoint = parsedDicomData.imageBaseOffset + layerOffset;
      } else {
        //TODO  will fail becuase dataSet.elements.x7fe00010.length is truncated length
        j2kStreamTruncationPoint = parsedDicomData.imageBaseOffset + dataSet.elements.x7fe00010.length-16;
      }

      if(j2kStreamTruncationPoint > dcmData.length){

        xhr = new XMLHttpRequest();
        xhr.open("GET", parsedId.url, false); // false makes this synchronous
        xhr.responseType = 'arraybuffer';
        xhr.setRequestHeader('Range', 'bytes=' + prefetchSize + '-' + j2kStreamTruncationPoint ); // the bytes (incl.) you request
        xhr.send(); // Blocks until response is complete
        if ( xhr.status !== 206 ) { // Throw an error if request failed
          throw Error(xhr.status + " " + xhr.statusText + ": " + parsedId.url);
        }

        deltaDcmData = new Uint8Array(xhr.response);
        newDcmData = new Uint8Array(dcmData.length + deltaDcmData.length);
        newDcmData.set(dcmData, 0);
        newDcmData.set(deltaDcmData, dcmData.length);
        dcmData = newDcmData;
      }

      var endDlTime = Date.now();


      dlTime = (endDlTime - startDlTime);

      jpxData = dcmData.subarray(parsedDicomData.imageBaseOffset, j2kStreamTruncationPoint);
      loadedLayers = 1;
    } else {
      // its an update
      parsedDicomData = e.data.parsedDicomData;
      console.log('update data : ' + parsedId.url);
      var oldDcmData = new Uint8Array(e.data.oldDcmData);
      // TODO: check param e.data.layers.
      j2kStreamTruncationPoint = parsedDicomData.imageBaseOffset + parsedDicomData.layers[parsedId.requestedQuality-1];


      xhr = new XMLHttpRequest();
      xhr.open("GET", parsedId.url, false); // false makes this synchronous
      xhr.responseType = 'arraybuffer';
      xhr.setRequestHeader('Range', 'bytes=' + oldDcmData.length + '-' + j2kStreamTruncationPoint ); // the bytes (incl.) you request
      xhr.send(); // Blocks until response is complete
      if ( xhr.status !== 206 ) { // Throw an error if request failed
        throw Error(xhr.status + " " + xhr.statusText + ": " + parsedId.url);
      }

      deltaDcmData = new Uint8Array(xhr.response);
      dcmData = new Uint8Array(oldDcmData.length + deltaDcmData.length);
      dcmData.set(oldDcmData, 0);
      dcmData.set(deltaDcmData, oldDcmData.length);

      jpxData = dcmData.subarray(parsedDicomData.imageBaseOffset, j2kStreamTruncationPoint);
      loadedLayers = parsedId.requestedQuality;
    }

    var startDecodeTime = Date.now();
    jpxImage.parse(jpxData);
    var endDecodeTime = Date.now();

    var decodeTime = (endDecodeTime - startDecodeTime);
    var fileSize = Math.round(jpxData.length / 1024);
    var width = jpxImage.width;
    var height = jpxImage.height;
    var componentsCount = jpxImage.componentsCount;
    var tileCount = jpxImage.tiles.length;
    var tileComponents = jpxImage.tiles[0];
    var pixelData = tileComponents.items;
    self.postMessage({
        workerId: e.data.workerId,
        pixelData: pixelData.buffer,
        dcmData: dcmData.buffer,
        width: width,
        height: height,
        fileSize: fileSize,
        decodeTime: decodeTime,
        downloadTime: dlTime,
        imageId: imageId,
        parsedDicomData: parsedDicomData,
        loadedLayers: loadedLayers,
    }, [pixelData.buffer, dcmData.buffer]);
};
