module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    sass: {
      options: {
        includePaths: ['content/foundation/scss', 'content/style']
      },
      dist: {
        options: {
          outputStyle: 'compressed'
        },
        files: {
          'content/dis/app.css': 'content/foundation/scss/foundation.scss',
          'content/dis/dashboard.css': 'content/style/dashboard.scss',
          'content/dis/home.css': 'content/style/home.scss',
          'content/dis/bw.css': 'content/style/bw.scss'
        }
      }
    },

    watch: {
      grunt: { files: ['Gruntfile.js'] },

      sass: {
        files: ['content/style/*.scss',
        'content/style/components/*.scss',
        'content/foundation/scss/*.scss',
        'content/foundation/scss/foundation/*.scss',
        'content/foundation/scss/foundation/components/*.scss'],
        tasks: ['sass']
      },
      js : {
        files: 'content/js/**/*',
        tasks: ['concat', 'uglify']
      },
      html : {
        files: 'content/templates/*.html',
        tasks: ['concat']
      }
    },

    concat: {
      options: {
        separator: ''
      },
      lib: {
        src: [
          'content/js/lib/*.js'
        ],
        dest: 'content/dis/lib.js'
      },
      templates: {
        src: 'content/templates/*.html',
        dest: 'content/dis/templates.html'
      },
      libdashboard: {
        src: [
          'content/foundation/js/foundation/foundation.js',
          'content/foundation/js/foundation/foundation.topbar.js',
          'content/foundation/js/foundation/foundation.dropdown.js'
        ],
        dest: 'content/dis/libdashboard.js'
      },
      dashboard: {
          src: [
            'content/js/utils.js',
            'content/js/ko.*.js',
            'content/js/apiClient.js',
            'content/js/sortable.js',
            'content/js/segment2.js',
            'content/js/dashboard.js',
            'content/js/tempdata.js',
            'content/js/pubsub.js',
            'content/js/keypress.js',
            'content/js/notifier.js',
            'content/js/widgeteditor.js',
            'content/js/controlpanel.js',
            'content/js/tooltipcontent.js'
          ],
          dest: 'content/dis/dashboard.js'
      },
      home: {
          src: [
            'content/js/utils.js',
            'content/js/tempdata.js',
            'content/js/models/labels.js',
            'content/js/charts/barchart.js',
            'content/js/charts/pie.js'
          ],
          dest: 'content/dis/home.js'
      },
      charts: {
        src: [
          'content/js/models/*.js',
          'content/js/charts/*.js'
        ],
        dest: 'content/dis/charts.js'
      }
    },
    uglify: {
      options: {
        banner: '/*!\n* <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %>\n* Simple Business Intelligence tool.\n* http://drata.io\n* Free to use under the MIT license.\n* http://www.opensource.org/licenses/mit-license.php\n*/\n',
        preserveComments: true
      },
      dist: {
        files: {
          'content/dis/<%= pkg.name %>.min.js': ['<%= concat.libdashboard.dest %>', '<%= concat.dashboard.dest %>','<%= concat.charts.dest %>'],
          'content/dis/<%= pkg.name %>.home.min.js': ['<%= concat.home.dest %>']
        }
      }
    },
    clean: {
      all: 'content/dis/**'
    },
    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin master',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: false,
        regExp: false
      }
    }
  });

  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-bump');

  grunt.registerTask('buildcss', ['sass']);
  grunt.registerTask('buildjs', ['concat', 'uglify']);
  grunt.registerTask('default', ['clean', 'buildcss', 'buildjs']);
}