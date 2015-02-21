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
                }, {
                    expand: true,
                    src: 'ext/jpx-medical/*.js',
                    dest: 'dist/js'
                }, ]
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
                    src: ['ext/jpx-medical/*.js'],
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
                    src: ['src/index.html'],
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
        }
    });


    grunt.registerTask('dev', ['clean', 'jshint:dev', 'copy:dev']);
    grunt.registerTask('prod', ['clean', 'uglify:prod', 'copy:prod', 'htmlmin:prod']);
    grunt.registerTask('up', ['prod', 'rsync:up']);
    grunt.registerTask('serv', ['dev', 'connect:serv', 'watch:serv']);
    grunt.registerTask('beautify', ['jsbeautifier']);
    grunt.registerTask('hook', ['copy:hooks']);
    grunt.registerTask('precommit', ['jsbeautifier:precommit', 'jshint:dev']);

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-rsync');
    grunt.loadNpmTasks("grunt-jsbeautifier");

};
