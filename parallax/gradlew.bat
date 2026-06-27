@rem Gradle startup script for Windows
@if "%DEBUG%" == "" @echo off
@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

set JAVACMD=java
if defined JAVA_HOME set JAVACMD=%JAVA_HOME%\bin\java.exe

%JAVACMD% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
