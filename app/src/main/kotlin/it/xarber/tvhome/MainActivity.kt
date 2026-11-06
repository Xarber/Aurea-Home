// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome

import androidx.activity.result.contract.ActivityResultContracts
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.widget.EditText
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import io.github.jqssun.airplay.BuildConfig

/** Same installed Home component; Expo is the actual native screen, never a WebView. */
class MainActivity : ReactActivity() {
    private val wifiPermission = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions -> val allowed=permissions[android.Manifest.permission.ACCESS_FINE_LOCATION]==true; AureaTVModule.event("notice",TVPlatform.safe("message",AppLanguage.text(this,if(allowed) "Wi-Fi name access enabled" else "Wi-Fi name is hidden without location permission"))) }
    fun requestWifiName() { wifiPermission.launch(arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION,android.Manifest.permission.ACCESS_COARSE_LOCATION)) }
    private val exportFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) try { contentResolver.openOutputStream(uri)?.use { output -> output.write(HomePreferences.export(this, getSharedPreferences("it.xarber.tvhome.MainActivity", 0)).toByteArray(Charsets.UTF_8)) }; AureaTVModule.event("notice", TVPlatform.safe("message", "Preferences exported")) } catch (_: Exception) { AureaTVModule.event("notice", TVPlatform.safe("message", "Export failed")) }
    }
    private val importFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) try { val text = contentResolver.openInputStream(uri).use { HomePreferences.readAndValidate(it) }; AlertDialog.Builder(this).setTitle(AppLanguage.text(this,"Import preferences")).setMessage(AppLanguage.text(this,"Replace presentation preferences? Pairings and accounts are preserved.")).setNegativeButton(android.R.string.cancel,null).setPositiveButton(android.R.string.ok) { _, _ -> try { HomePreferences.restore(this,getSharedPreferences("it.xarber.tvhome.MainActivity",0),text);AureaTVModule.event("home",org.json.JSONObject()) } catch (_: Exception) { AureaTVModule.event("notice",TVPlatform.safe("message","Import failed")) } }.show() } catch (_: Exception) { AureaTVModule.event("notice",TVPlatform.safe("message","Invalid preferences file")) }
    }
    fun exportPreferences() { exportFile.launch("Aurea-Home-preferences.json") }
    fun importPreferences() { importFile.launch(arrayOf("application/json","text/plain")) }
    private var previewApproval = ""
    private val previewConsent = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val approval=previewApproval;previewApproval=""
        if(result.resultCode==android.app.Activity.RESULT_OK&&result.data!=null)AppPreviewService.approved(this,approval,result.resultCode,result.data) else AppPreviewService.denied(approval)
    }
    private fun showPreviewConsent(){if(previewApproval!=AppPreviewService.approvalId()){previewApproval="";return};try{previewConsent.launch(getSystemService(android.media.projection.MediaProjectionManager::class.java).createScreenCaptureIntent())}catch(_:Exception){AppPreviewService.denied(previewApproval);previewApproval=""}}
    private val previewAudioPermission=registerForActivityResult(ActivityResultContracts.RequestPermission()){showPreviewConsent()}
    private fun requestPreviewApproval(){if(BuildConfig.MOBILE_REMOTE||previewApproval.isNotEmpty()||!AppPreviewService.awaiting())return;previewApproval=AppPreviewService.approvalId();AlertDialog.Builder(this).setTitle("Share an app preview?").setMessage("A paired remote requests an encrypted, temporary view of this screen. App audio is included only when permitted. HDMI and protected content are unavailable. Sharing stops after two minutes or when the remote disconnects.").setNegativeButton(android.R.string.cancel){_,_->AppPreviewService.denied(previewApproval);previewApproval=""}.setOnCancelListener{AppPreviewService.denied(previewApproval);previewApproval=""}.setPositiveButton("Continue"){_,_->if(android.os.Build.VERSION.SDK_INT>=29&&checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED)previewAudioPermission.launch(android.Manifest.permission.RECORD_AUDIO) else showPreviewConsent()}.show()}
    private val main = Handler(Looper.getMainLooper())
    companion object { @JvmField var interfaceReady = false; private var liveHome = java.lang.ref.WeakReference<MainActivity>(null) }
    override fun attachBaseContext(base: Context) = super.attachBaseContext(AppLanguage.wrap(base))
    override fun getMainComponentName() = "main"
    override fun createReactActivityDelegate(): ReactActivityDelegate = ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {})
    override fun onCreate(state: Bundle?) {
        setTheme(io.github.jqssun.airplay.R.style.AureaExpoHome)
        if (!BuildConfig.MOBILE_REMOTE) {
            // Android can create HOME and ordinary task instances despite singleTask.
            // Retire the old root before both can consume the shared React key emitter.
            liveHome.get()?.takeIf { it !== this && !it.isFinishing }?.finish()
            liveHome = java.lang.ref.WeakReference(this)
            interfaceReady = false
        }
        super.onCreate(null)
        if (!BuildConfig.MOBILE_REMOTE) window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        if (!BuildConfig.MOBILE_REMOTE) main.postDelayed({ if (!isFinishing && !interfaceReady) AlertDialog.Builder(this).setTitle("Aurea Home").setMessage("The new interface could not start. Your saved settings are intact.").setPositiveButton("Retry") { _, _ -> recreate() }.setNeutralButton("Recovery Home") { _, _ -> startActivity(Intent(this, LegacyHomeActivity::class.java)) }.show() }, 25000)
    }
    override fun onResume() { super.onResume(); TVPlatform.get(this).resume(this); if (!BuildConfig.MOBILE_REMOTE) HomeRemoteService.attachExpo(this);main.post{requestPreviewApproval()} }
    override fun onPause() { TVPlatform.get(this).pause(this); super.onPause() }
    override fun onDestroy() { if (liveHome.get() === this) liveHome.clear(); main.removeCallbacksAndMessages(null); super.onDestroy() }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); main.post{requestPreviewApproval()}; AureaTVModule.event("home", org.json.JSONObject()) }
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (!BuildConfig.MOBILE_REMOTE && currentFocus !is EditText && TVPlatform.key(event)) return true
        return super.dispatchKeyEvent(event)
    }
    override fun invokeDefaultOnBackPressed() { if (BuildConfig.MOBILE_REMOTE) super.invokeDefaultOnBackPressed() else AureaTVModule.event("back", org.json.JSONObject()) }
}
