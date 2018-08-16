set APPVEYOR_BUILD_WORKER_IMAGE=Visual Studio 2010
set DEVENV_EXE="C:\Program Files (x86)\Microsoft Visual Studio 10.0\Common7\IDE\devenv.exe"
set VSDEVCMD_BAT="C:\Program Files (x86)\Microsoft Visual Studio 10.0\Common7\Tools\vsvars32.bat"
cd deps
	:: zlib
curl -fsSL -o zlib.tar.gz https://github.com/madler/zlib/archive/v1.2.8.tar.gz
7z x zlib.tar.gz -so | 7z x -si -ttar > nul
move zlib-1.2.8 zlib
cd zlib
cmake . -DCMAKE_BUILD_TYPE=Release
cmake --build .
cd ..
	:: libPNG
curl -fsSL -o libpng.tar.gz http://prdownloads.sourceforge.net/libpng/libpng-1.6.28.tar.gz?download
7z x libpng.tar.gz -so | 7z x -si -ttar > nul
move libpng-1.6.28 libpng
cd libpng
cmake . -DCMAKE_BUILD_TYPE=Release -DZLIB_INCLUDE_DIR=..\zlib -DZLIB_LIBRARY=..\zlib\debug\zlibstaticd.lib
cmake --build .
cd ..
	:: Berkeley DB - required by SASL
curl -fsSL -o db-4.1.25.tar.gz http://download.oracle.com/berkeley-db/db-4.1.25.tar.gz
7z x db-4.1.25.tar.gz -so | 7z x -si -ttar > nul
move db-4.1.25 db
cd db\build_win32
echo using devenv %DEVENV_EXE%
%DEVENV_EXE% db_dll.dsp /upgrade
msbuild /p:Configuration=Release db_dll.vcxproj
cd ..\..
	:: Cyrus SASL
curl -fsSL -o cyrus-sasl-2.1.26.tar.gz ftp://ftp.cyrusimap.org/cyrus-sasl/cyrus-sasl-2.1.26.tar.gz
7z x cyrus-sasl-2.1.26.tar.gz -so | 7z x -si -ttar > nul
move cyrus-sasl-2.1.26 sasl
cd sasl
patch -p1 -i ..\sasl-fix-snprintf-macro.patch
echo using vsdevcmd %VSDEVCMD_BAT%
call %VSDEVCMD_BAT%
nmake /f NTMakefile OPENSSL_INCLUDE=c:\OpenSSL-Win32\include OPENSSL_LIBPATH=c:\OpenSSL-Win32\lib DB_INCLUDE=C:\Users\Milo\Desktop\libvncserver\deps\db\build_win32 DB_LIBPATH=c=C:\Users\Milo\Desktop\libvncserver\deps\db\build_win32\release DB_LIB=libdb41.lib install
cd ..
	:: go back to source root
cd ..
mkdir build
cd build 
cmake .. -DZLIB_INCLUDE_DIR=..\deps\zlib -DZLIB_LIBRARY=..\deps\zlib\release\zlibstaticd.lib -DPNG_PNG_INCLUDE_DIR=..\deps\libpng -DPNG_LIBRARY=..\deps\libpng\release\libpng16_staticd.lib -D SASL2_INCLUDE_DIR=c:\cmu\include -D LIBSASL2_LIBRARIES=c:\cmu\lib\libsasl.lib ..
cmake --build .
ctest -C Release --output-on-failure

pause