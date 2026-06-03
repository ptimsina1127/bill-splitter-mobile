package com.ptimsina.billsplitter

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import java.lang.reflect.Proxy

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }

  override fun onCreate() {
    overrideReactNativeFeatureFlags()
    super.onCreate()
    SoLoader.init(this, false)
  }

  private fun overrideReactNativeFeatureFlags() {
    try {
      val defaultsClass = Class.forName("com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsDefaults")
      val defaults = defaultsClass.getDeclaredConstructor().newInstance()

      val providerClass = Class.forName("com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsAccessorProvider")
      val provider = Proxy.newProxyInstance(
        providerClass.classLoader,
        arrayOf(providerClass)
      ) { _, _, _ -> defaults }

      val flagsClass = Class.forName("com.facebook.react.internal.featureflags.ReactNativeFeatureFlags")
      val setProvider = flagsClass.getDeclaredMethod("setAccessorProvider", providerClass)
      setProvider.isAccessible = true
      setProvider.invoke(null, provider)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
