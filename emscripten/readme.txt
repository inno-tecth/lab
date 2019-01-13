C:\Innotech\libraries\emsdk\emsdk activate latest
C:\Innotech\libraries\emsdk\emsdk_env.bat




Microsoft Windows [Version 10.0.17134.523]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Users\milo>emcc
'emcc' is not recognized as an internal or external command,
operable program or batch file.

C:\Users\milo>C:\Innotech\libraries\emsdk\emsdk_env.bat
Adding directories to PATH:
PATH += C:\Innotech\libraries\emsdk
PATH += C:\Innotech\libraries\emsdk\clang\e1.38.22_64bit
PATH += C:\Innotech\libraries\emsdk\node\8.9.1_64bit\bin
PATH += C:\Innotech\libraries\emsdk\python\2.7.13.1_64bit\python-2.7.13.amd64
PATH += C:\Innotech\libraries\emsdk\java\8.152_64bit\bin
PATH += C:\Innotech\libraries\emsdk\emscripten\1.38.22

Setting environment variables:
EMSDK = C:/Innotech/libraries/emsdk
EM_CONFIG = C:\Users\milo\.emscripten
LLVM_ROOT = C:\Innotech\libraries\emsdk\clang\e1.38.22_64bit
EMSCRIPTEN_NATIVE_OPTIMIZER = C:\Innotech\libraries\emsdk\clang\e1.38.22_64bit\optimizer.exe
BINARYEN_ROOT = C:\Innotech\libraries\emsdk\clang\e1.38.22_64bit\binaryen
EMSDK_NODE = C:\Innotech\libraries\emsdk\node\8.9.1_64bit\bin\node.exe
EMSDK_PYTHON = C:\Innotech\libraries\emsdk\python\2.7.13.1_64bit\python-2.7.13.amd64\python.exe
JAVA_HOME = C:\Innotech\libraries\emsdk\java\8.152_64bit
EMSCRIPTEN = C:\Innotech\libraries\emsdk\emscripten\1.38.22


C:\Users\milo>emcc
emscripten:INFO: generating system asset: is_vanilla.txt... (this will be cached in "C:\Users\milo\.emscripten_cache\is_vanilla.txt" for subsequent builds)
emscripten:INFO:  - ok
shared:INFO: (Emscripten: Running sanity checks)
emcc:WARNING: no input files

C:\Users\milo>cd C:\Innotech\labs\emscripten

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.html
emscripten:INFO: generating system library: libc++_noexcept.a... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\libc++_noexcept.a" for subsequent builds)
emscripten:INFO:  - ok
emscripten:INFO: generating system library: libc++abi.bc... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\libc++abi.bc" for subsequent builds)
emscripten:INFO:  - ok
emscripten:INFO: generating system library: libc.bc... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\libc.bc" for subsequent builds)
emscripten:INFO:  - ok
emscripten:INFO: generating system library: libcompiler_rt.a... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\libcompiler_rt.a" for subsequent builds)
emscripten:INFO:  - ok
emscripten:INFO: generating system library: libc-wasm.bc... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\libc-wasm.bc" for subsequent builds)
emscripten:INFO:  - ok
emscripten:INFO: generating system library: libdlmalloc.bc... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\libdlmalloc.bc" for subsequent builds)
emscripten:INFO:  - ok
emscripten:INFO: generating system asset: generated_struct_info.json... (this will be cached in "C:\Users\milo\.emscripten_cache\asmjs\generated_struct_info.json" for subsequent builds)
emscripten:INFO:  - ok

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js -s WASM=0

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js -s WASM=0 -Oz

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js -s WASM=0 -Oz
demo01.cpp:3:18: error: use of undeclared identifier 'std'
  MyClass(int x, std::string y)
                 ^
demo01.cpp:15:10: error: use of undeclared identifier 'std'
  static std::string getStringFromInstance(const MyClass& instance) {
         ^
demo01.cpp:21:3: error: use of undeclared identifier 'std'
  std::string y;
  ^
demo01.cpp:25:1: error: unknown type name 'EMSCRIPTEN_BINDINGS'
EMSCRIPTEN_BINDINGS(my_class_example) {
^
demo01.cpp:25:38: error: expected ';' after top level declarator
EMSCRIPTEN_BINDINGS(my_class_example) {
                                     ^
                                     ;
5 errors generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js -s WASM=0 -Oz
demo01.cpp:28:1: error: unknown type name 'EMSCRIPTEN_BINDINGS'
EMSCRIPTEN_BINDINGS(my_class_example) {
^
demo01.cpp:28:38: error: expected ';' after top level declarator
EMSCRIPTEN_BINDINGS(my_class_example) {
                                     ^
                                     ;
2 errors generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc demo01.cpp -o demo01.js -s WASM=0 -Oz
In file included from demo01.cpp:3:
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/bind.h:11:2: error: Including
      <emscripten/bind.h> requires building with -std=c++11 or newer!
#error Including <emscripten/bind.h> requires building with -std=c++11 or newer!
 ^
demo01.cpp:29:1: error: unknown type name 'EMSCRIPTEN_BINDINGS'
EMSCRIPTEN_BINDINGS(my_class_example) {
^
demo01.cpp:29:38: error: expected ';' after top level declarator
EMSCRIPTEN_BINDINGS(my_class_example) {
                                     ^
                                     ;
3 errors generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -Oz
demo01.cpp:30:3: error: no template named 'class_'; did you mean 'emscripten::class_'?
  class_<MyClass>("MyClass")
  ^~~~~~
  emscripten::class_
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/bind.h:1118:11: note: 'emscripten::class_'
      declared here
    class class_ {
          ^
1 error generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -Oz
demo01.cpp:31:3: error: no template named 'class_'; did you mean 'emscripten::class_'?
  class_<MyClass>("MyClass")
  ^~~~~~
  emscripten::class_
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/bind.h:1118:11: note: 'emscripten::class_'
      declared here
    class class_ {
          ^
1 error generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -Oz

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -Oz

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O1

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O1

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2 -fno-rtti -fno-exceptions
In file included from demo01.cpp:4:
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/bind.h:21:
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/val.h:15:
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/wire.h:71:21: error: static_assert failed due
      to requirement '!has_unbound_type_names' "Unbound type names are illegal with RTTI disabled. Either add
      -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 to or remove -fno-rtti from the compiler arguments"
                    static_assert(!has_unbound_type_names,
                    ^             ~~~~~~~~~~~~~~~~~~~~~~~
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/wire.h:91:17: error: static_assert failed due
      to requirement '!has_unbound_type_names' "Unbound type names are illegal with RTTI disabled. Either add
      -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 to or remove -fno-rtti from the compiler arguments"
                static_assert(!has_unbound_type_names,
                ^             ~~~~~~~~~~~~~~~~~~~~~~~
2 errors generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2 -fno-rtti
In file included from demo01.cpp:4:
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/bind.h:21:
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/val.h:15:
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/wire.h:71:21: error: static_assert failed due
      to requirement '!has_unbound_type_names' "Unbound type names are illegal with RTTI disabled. Either add
      -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 to or remove -fno-rtti from the compiler arguments"
                    static_assert(!has_unbound_type_names,
                    ^             ~~~~~~~~~~~~~~~~~~~~~~~
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/wire.h:91:17: error: static_assert failed due
      to requirement '!has_unbound_type_names' "Unbound type names are illegal with RTTI disabled. Either add
      -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 to or remove -fno-rtti from the compiler arguments"
                static_assert(!has_unbound_type_names,
                ^             ~~~~~~~~~~~~~~~~~~~~~~~
2 errors generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2 -fno-rtti -fno-exceptions
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\lib\embind\bind.cpp:6:
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/bind.h:21:
In file included from C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/val.h:15:
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/wire.h:71:21: error: static_assert failed due
      to requirement '!has_unbound_type_names' "Unbound type names are illegal with RTTI disabled. Either add
      -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 to or remove -fno-rtti from the compiler arguments"
                    static_assert(!has_unbound_type_names,
                    ^             ~~~~~~~~~~~~~~~~~~~~~~~
C:\Innotech\libraries\emsdk\emscripten\1.38.22\system\include\emscripten/wire.h:91:17: error: static_assert failed due
      to requirement '!has_unbound_type_names' "Unbound type names are illegal with RTTI disabled. Either add
      -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 to or remove -fno-rtti from the compiler arguments"
                static_assert(!has_unbound_type_names,
                ^             ~~~~~~~~~~~~~~~~~~~~~~~
2 errors generated.
shared:ERROR: compiler frontend failed to generate LLVM bitcode, halting

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O2

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O0

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O3 --memory-init-file 0

C:\Innotech\labs\emscripten>emcc --bind demo01.cpp -o demo01.js -s WASM=0 -O3 --memory-init-file 0 --pre-js pre.js --post-js post.js