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
          'content/style/app.css': 'content/foundation/scss/foundation.scss',
          'content/style/dashboard.css': 'content/style/dashboard.scss',
          'content/style/home.css': 'content/style/home.scss'
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
      }
    },

    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: ''
      },
      dist: {
        // the files to concatenate
        src: [
        'content/js/lib/*.js',
        'content/js/ko.*.js',
        'content/js/utils.js',
        'content/foundation/js/foundation/foundation.js',
        'content/foundation/js/foundation/foundation.topbar.js',
        'content/foundation/js/foundation/foundation.dropdown.js',
        'content/js/models/*.js',
        'content/js/charts/*.js',
        'content/js/apiClient.js',
        'content/js/sortable.js',
        'content/js/segment2.js',
        'content/js/dashboard.js',
        'content/js/tempdata.js',
        'content/js/pubsub.js',
        'content/js/keypress.js',
        'content/js/notifier.js',
        'content/js/controlpanel.js',
        'content/js/tooltipcontent.js'
        ],
        // the location of the resulting JS file
        dest: 'content/dis/<%= pkg.name %>.js'
      }
    },

    uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
        preserveComments: true
      },
      dist: {
        files: {
          'content/dis/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('buildcss', ['sass']);
  grunt.registerTask('buildjs', ['concat', 'uglify']);
  grunt.registerTask('default', ['buildcss', 'buildjs', 'watch']);
}