A standard compliant dcm-j2k streaming viewer prototype. See [demo](http://jpambrun.github.io).

## Dependencies
[Modified PDF.js j2k decoder] (https://github.com/jpambrun/jpx-medical)

[Cornerstones interactive medical images library] (https://github.com/jpambrun/cornerstone)

## Streaming requirements
The decoder need to know meaningfull j2k truncation points in order to enable streaming.
These truncation points are currently passed using private DICOM tags:
```
(0069,1012) truncation offset of layer 1 from the beginning of the j2k codestream
(0069,1013) truncation offset of layer 2
(0069,1013) truncation offset of layer 3
```
