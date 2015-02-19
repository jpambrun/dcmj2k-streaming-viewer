/*global getParameterByName*/

var cornerstoneDCMJ2KImageLoader = (function ($, cornerstone, cornerstoneDCMJ2KImageLoader) {

    if(cornerstoneDCMJ2KImageLoader === undefined) {
        cornerstoneDCMJ2KImageLoader = {};
    }

    var dcmdlworker;
    var dcmdlworkerDeferred={};
    var imageLoaderCallback;
    var workerCount = 0;
    var numWorker = 8;

    if (dcmdlworker === undefined) {
            dcmdlworker = [];
            for (var i = 0; i < numWorker; i++) {
                dcmdlworker[i] = new Worker('js/dcmdlworker.js');
                dcmdlworker[i].onmessage = handleWorkerMessage;
            }
    }

    function loadImage(imageId) {
        var deferred = $.Deferred();
        var parsedId = parseImageId(imageId);


        //is it already in cache?
        var cachedImagePromise;
        try {
          for (var i = parsedId.requestedQuality-1; i > 1; i--) {
            //is the image already loaded.
            cachedImagePromise = cornerstone.imageCache.getImagePromise(parsedId.scheme + ':' + parsedId.url + '?quality=i');
            break;
          }
        } catch(e){
          //it's ok, move along.
        }

        if (cachedImagePromise !== undefined) {
          console.log('Update!');
        }

        dcmdlworkerDeferred[imageId] = deferred;
        dcmdlworker[workerCount % numWorker].postMessage({ imageId:imageId });
        workerCount++;
        return deferred;
    }


    // update a image in cache with more quality layers
    //function updateImage(imageId, privateData) {
      //cornerstone.imageCache.getImagePromise(imageId).state()=="resolved"
      //var deferred = $.Deferred();

      //cornerstone.imageCache.getImagePromise(imageId).then(function(image) {
        //var url = imageId;
        //url = url.substring(7);
        //var oldDcmData = new Uint8Array(image.getDcmData());

        //dcmdlworkerDeferred[imageId] = deferred;

        //dcmdlworker[workerCount % numWorker].postMessage({
          //oldDcmData: oldDcmData,
          //imageId: imageId,
          //qualityLayer: privateData,
          //parsedDicomData: image.parsedDicomData,
        //}, [oldDcmData.buffer]);

        //workerCount++;
      //});

      //return deferred;
    //}

    function handleWorkerMessage(e){
//      dcmdlworker[workerCount % numWorker].removeEventListener("message", arguments.callee, false);
      var pixelData = new Int16Array(e.data.pixelData);
      var dcmData = new Uint8Array(e.data.dcmData);
      var width = e.data.width;
      var height = e.data.height;
      var imageId = e.data.imageId;
      var loadedLayers = e.data.loadedLayers;
      var parsedDicomData = e.data.parsedDicomData;
      var parsedId = parseImageId(imageId);

      var image = {
        imageId: imageId,
        minPixelValue: -1100,
        maxPixelValue: 2500,
        windowCenter: -600,
        windowWidth: 1600,
        render: cornerstone.renderGrayscaleImage,
        getDcmData: function getDcmData() {
          return dcmData;
        },
        getPixelData: function getPixelData() {
          return pixelData;
        },
        rows: width,
        columns: height,
        height: height,
        width: width,
        color: false,
        columnPixelSpacing: 0.8984375,
        rowPixelSpacing: 0.8984375,
        slope: parsedDicomData.rescaleSlope,
        intercept: parsedDicomData.rescaleIntercept,
        compressedFileSize: e.data.fileSize,
        downloadTime: e.data.downloadTime,
        decodingTime: e.data.decodeTime,
        sizeInBytes: dcmData.length + pixelData.length*2,
        loadedLayers: loadedLayers,
        parsedDicomData: parsedDicomData,
      };

      if(imageLoaderCallback !== undefined){
        imageLoaderCallback();
      }

      var deferred = dcmdlworkerDeferred[imageId];
      delete dcmdlworkerDeferred[imageId];
      deferred.resolve(image);
    }

    function setCallback(callback){
        imageLoaderCallback = callback;
    }

    cornerstone.registerImageLoader('dcmj2k', loadImage);
    //cornerstone.registerImageUpdater('dcmj2k', updateImage);

    // module exports
    cornerstoneDCMJ2KImageLoader.setCallback = setCallback;

    return cornerstoneDCMJ2KImageLoader;
}($, cornerstone, cornerstoneDCMJ2KImageLoader));
