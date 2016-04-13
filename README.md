A standard compliant dcm-j2k streaming viewer prototype. See [demo](http://jpambrun.github.io).

## Dependencies
[Modified PDF.js j2k decoder] (https://github.com/jpambrun/jpx-medical)
[Cornerstones interactive medical images library] (https://github.com/jpambrun/cornerstone)

```
git submodule init
git submodule update
bower install
npm install
```

## Streaming requirements
The decoder need to know meaningfull j2k truncation points in order to enable streaming.
These truncation points are currently passed using private DICOM tags:
```
(0069,1012) truncation offset of layer 1 from the beginning of the j2k codestream
(0069,1013) truncation offset of layer 2
(0069,1013) truncation offset of layer 3
```

### OPJ vs. JPX benchmark
On a 3 core VM

| Decoder | Quality layer |  Browser  | avr decode (ms) |
|---------|---------------| --------- |----------------:| 
|   OPJ   |         1     |   Chrome  |      32.79      |
|         |         1     |   Firefox |      22.05      |
|         |         2     |   Chrome  |      62.66      |
|         |         2     |   Firefox |      36.87      |
|   JPX   |         1     |   Chrome  |      58.70      |
|         |         1     |   Firefox |      57.60      |
|         |         2     |   Chrome  |      96.54      |
|         |         2     |   Firefox |      87.88      |
