closure-library/closure/bin/build/closurebuilder.py\
 --root=closure-library/\
 --output_mode=compiled --compiler_jar=../closure-compiler/build/compiler.jar\
 --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS"\
 --compiler_flags="--warning_level=VERBOSE"\
 --compiler_flags="--summary_detail_level=3"\
 --compiler_flags="--define='goog.DEBUG=false'"\
 --compiler_flags="--define='DEBUG=false'"\
 --compiler_flags="--define='goog.userAgent.jscript.ASSUME_NO_JSCRIPT'"\
 --compiler_flags="--language_in=ECMASCRIPT5_STRICT"\
 --namespace="demo"\
 --output_file=js/demo.min.js\
 js/demo.js\
 js/modernizr/modernizr.custom.js\
 js/SCD.js/EventEmitter.js\
 js/SCD.js/scd.js
