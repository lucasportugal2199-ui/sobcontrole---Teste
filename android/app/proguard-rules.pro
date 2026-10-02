# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Ignorar dependências opcionais de redes sociais desativadas (evita falha do R8 por missing classes)
-dontwarn com.facebook.**
-dontwarn com.twitter.**
-dontwarn com.twitter.sdk.android.**

# --- Regras para o build de release encolhido (minifyEnabled) ---

# Relatórios de crash no Play Console com número de linha (o mapping vai no .aab)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Classes do próprio app: plugin nativo (BankNotificationPlugin), serviço de
# notificações e widgets são referenciados por nome (manifest/Capacitor)
-keep class com.sobcontrole.app.** { *; }

# Login com Google: o Credential Manager carrega o provedor do Play Services por reflexão
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** { *; }

# --- Capacitor (causa do crash da 1.9.2 com minify ligado) ---
# O Capacitor lê as anotações @CapacitorPlugin/@Permission dos plugins por
# reflexão (ex.: permissões das notificações). O R8 renomeava as anotações e
# seus métodos → NullPointerException em Plugin.getPermissionStates ao abrir.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keep class com.getcapacitor.** { *; }
-keep @interface com.getcapacitor.annotation.** { *; }
# Plugins usados pelo app (classes chamadas pela ponte JS por reflexão)
-keep class com.capacitorjs.plugins.** { *; }
-keep class ee.forgr.** { *; }
-keep class cc.fovea.** { *; }
-keep class org.apache.cordova.** { *; }
