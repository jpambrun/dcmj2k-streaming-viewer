/* Copyright (c) 2015, Jean-Francois Pambrun
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.  */

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // configure jshint to validate js files -----------------------------------

        clean: ['dist'],

        jsbeautifier: {
            "default": {
                src: ['gruntfile.js', 'src/**/*.js', 'src/**/*.html'],
                options: {
                    js: {
                        jslintHappy: true
                    }
                }
            },
            "precommit": {
                src: ['gruntfile.js', 'src/**/*.js', 'src/**/*.html'],
                options: {
                    mode: "VERIFY_ONLY",
                    js: {
                        jslintHappy: true
                    }
                },
            }
        },

        jshint: {
            options: {
                '-W097': true,
                browser: true, // define globals exposed by modern browsers?
                devel: true,
                nonstandard: true,
                worker: true,
                reporter: require('jshint-stylish') // use jshint-stylish to make our errors look and read good
            },

            // when this task is run, lint the Gruntfile and all js files in src
            dev: ['Grunfile.js', 'src/js/**/*.js']
        },

        uglify: {
            options: {
                banner: '/*\n <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> \n*/\n'
            },
            prod: {
                files: [{
                    expand: true,
                    cwd: 'src/js',
                    src: '**/*.js',
                    dest: 'dist/js'
                }]
            }
        },

        htmlmin: { // Task
            prod: { // Target
                options: { // Target options
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyJS: true
                },
                files: { // Dictionary of files
                    'dist/index.html': 'src/index.html', // 'destination': 'source'
                    'dist/bench.html': 'src/bench.html', // 'destination': 'source'
                }
            },
        },

        copy: {
            hooks: {
                options: {
                    mode: 0755,
                },
                files: [{
                    expand: true,
                    flatten: true,
                    filter: 'isFile',
                    src: ['githooks/*'],
                    dest: '.git/hooks/',
                    mode: '0755',
                }],
            },
            prod: {
                files: [{
                    expand: true,
                    cwd: 'src/fonts/',
                    src: ['**'],

                    dest: 'dist/fonts/'
                }, {
                    src: ['bower_components/dicomParser/dist/dicomParser.min.js'],
                    dest: 'dist/js/dicomparser.js'
                }, {
                    src: ['ext/cornerstone/dist/cornerstone.min.js'],
                    dest: 'dist/js/cornerstone.js'
                }, {
                    src: ['ext/cornerstone/dist/cornerstone.min.css'],
                    dest: 'dist/js/cornerstone.css'
                }, {
                    src: ['bower_components/cornerstoneTools/dist/cornerstoneTools.min.js'],
                    dest: 'dist/js/cornerstonetools.js'
                }, {
                    src: ['bower_components/cornerstoneMath/dist/cornerstoneMath.min.js'],
                    dest: 'dist/js/cornerstonemath.js'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['src/css/*.css'],
                    dest: 'dist/css/',
                    filter: 'isFile'
                }, {
                    src: ['ext/jpx-medical/dist/jpx.min.js'],
                    dest: 'dist/js/jpx.js',
                }, {
                    expand: true,
                    flatten: true,
                    src: ['data/test*'],
                    dest: 'dist/data/',
                    filter: 'isFile'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['data/000*'],
                    dest: 'dist/data/',
                    filter: 'isFile'
                }, ]
            },

            dev: {
                files: [{
                    expand: true,
                    cwd: 'src/fonts/',
                    src: ['**'],
                    dest: 'dist/fonts/'
                }, {
                    src: ['ext/cornerstone/dist/cornerstone.js'],
                    dest: 'dist/js/cornerstone.js'
                }, {
                    src: ['ext/cornerstone/dist/cornerstone.css'],
                    dest: 'dist/js/cornerstone.css'
                }, {
                    src: ['bower_components/dicomParser/dist/dicomParser.js'],
                    dest: 'dist/js/dicomparser.js'
                }, {
                    src: ['bower_components/cornerstoneTools/dist/cornerstoneTools.js'],
                    dest: 'dist/js/cornerstonetools.js'
                }, {
                    src: ['bower_components/cornerstoneMath/dist/cornerstoneMath.js'],
                    dest: 'dist/js/cornerstonemath.js'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['src/js/*.js'],
                    dest: 'dist/js/',
                    filter: 'isFile'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['ext/jpx-medical/dist/jpx.js'],
                    dest: 'dist/js/',
                    filter: 'isFile'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['src/css/*.css'],
                    dest: 'dist/css/',
                    filter: 'isFile'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['src/*.html'],
                    dest: 'dist/',
                    filter: 'isFile'
                }, {
                    expand: true,
                    flatten: true,
                    src: ['data/test*'],
                    dest: 'dist/data/',
                    filter: 'isFile'
                }, ]
            },

        },


        connect: {
            serv: {
                options: {
                    port: 8000,
                    hostname: 'localhost',
                    base: 'dist'
                },
            }
        },

        watch: {
            serv: {
                files: ['src/**/*', 'bower_components/cornerstone/dist/*', 'bower_components/dicomparser/dist*'],
                tasks: ['dev']
            }
        },

        rsync: {
            options: {
                args: ["--verbose"],
                exclude: [".git*", "*.scss", "node_modules"],
                recursive: true,
                compareMode: "checksum"
            },
            up: {
                options: {
                    args: ['--chmod 775'],
                    src: "dist/",
                    dest: "~/www_jpx",
                    host: "do",
                    //delete: true // Careful this option could cause data loss, read the docs!
                }
            }
        },
        shell: {
            bench: {
                command: 'go build -o dist/bench  -i src/go/main.go && cd dist && ./bench',
                options: {
                    execOptions: {
                        maxBuffer: Infinity
                    }
                }

            }
        }
    });


    grunt.registerTask('dev', ['jshint:dev', 'copy:dev']);
    grunt.registerTask('prod', ['uglify:prod', 'copy:prod', 'htmlmin:prod']);
    grunt.registerTask('up', ['prod', 'rsync:up']);
    grunt.registerTask('serv', ['dev', 'connect:serv', 'watch:serv']);
    grunt.registerTask('beautify', ['jsbeautifier']);
    grunt.registerTask('hook', ['copy:hooks']);
    grunt.registerTask('bench', ['dev', 'shell:bench']);
    grunt.registerTask('precommit', ['jsbeautifier:precommit', 'jshint:dev']);

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-rsync');
    grunt.loadNpmTasks("grunt-jsbeautifier");
};
