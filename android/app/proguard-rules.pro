# Hellenic Directory — ProGuard / R8 rules
# ==========================================

# ── Moshi ────────────────────────────────────────────────────────────────────
# Keep all data classes used as JSON models so Moshi's generated adapters can
# reference their constructors, fields, and property names at runtime.
# Without these rules, R8 will strip or rename the fields and JSON parsing will
# fail silently (null values) or throw a JsonDataException in release builds.
-keep class com.hellenicdir.data.remote.dto.** { *; }
-keepclassmembers class com.hellenicdir.data.remote.dto.** { *; }

# Keep Moshi's generated JsonAdapter classes (created by moshi-kotlin-codegen KSP)
-keep class **JsonAdapter { *; }
-keep class **JsonAdapter$* { *; }

# Moshi internal reflection support (used as fallback when no generated adapter exists)
-keep class com.squareup.moshi.** { *; }
-keepclasseswithmembers class * {
    @com.squareup.moshi.* <fields>;
}
-keepclasseswithmembers class * {
    @com.squareup.moshi.* <methods>;
}

# ── Retrofit ─────────────────────────────────────────────────────────────────
-keep class retrofit2.** { *; }
-keepattributes Signature, Exceptions, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# ── OkHttp ───────────────────────────────────────────────────────────────────
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ── Kotlin coroutines ────────────────────────────────────────────────────────
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# ── Hilt / Dagger ────────────────────────────────────────────────────────────
# Hilt generates code at compile time so most things are kept automatically,
# but the component entry points need explicit retention.
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }

# ── AndroidX Security Crypto ──────────────────────────────────────────────────
-keep class androidx.security.crypto.** { *; }

# ── Firebase Messaging ────────────────────────────────────────────────────────
-keep class com.hellenicdir.core.push.HDFirebaseMessagingService { *; }

# ── General Android/Kotlin ────────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Preserve enum constants (safe to obfuscate class names, but values() must work)
-keepclassmembers enum * { public static **[] values(); public static ** valueOf(java.lang.String); }
