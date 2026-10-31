package com.tondraaga.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Toast;

/**
 * Tondraaga: the shop boutique.visionaryentreprises.com in a full-screen WebView,
 * with a branded splash, an offline page, file upload (payment proofs), location
 * for delivery pricing, and external apps for WhatsApp, phone and other sites.
 */
public class MainActivity extends Activity {

    private static final String HOME = "https://boutique.visionaryentreprises.com/";
    private static final String SITE_DOMAIN = "visionaryentreprises.com";
    private static final String OFFLINE_PAGE = "file:///android_asset/offline.html";
    private static final int REQ_FILE = 1;
    private static final int REQ_LOCATION = 2;

    private WebView web;
    private ProgressBar progress;
    private View splash;
    private ValueCallback<Uri[]> fileCallback;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private String failedUrl;
    private long lastBackPress;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);

        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(ColorStateList.valueOf(getColor(R.color.ocre)));
        progress.setProgressBackgroundTintList(ColorStateList.valueOf(Color.TRANSPARENT));
        FrameLayout.LayoutParams barParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(4));
        barParams.gravity = Gravity.TOP;
        root.addView(progress, barParams);

        splash = buildSplash();
        root.addView(splash, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(root);
        configureWebView();

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
            splash.setVisibility(View.GONE);
        } else {
            web.loadUrl(startUrl(getIntent()));
            // never keep the splash for ever, even on a slow network
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    hideSplash();
                }
            }, 9000);
        }
    }

    private View buildSplash() {
        FrameLayout box = new FrameLayout(this);
        box.setBackgroundColor(getColor(R.color.creme));
        box.setClickable(true);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo_splash);
        logo.setAdjustViewBounds(true);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(dp(240), ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER;
        box.addView(logo, lp);
        ProgressBar spinner = new ProgressBar(this);
        spinner.setIndeterminateTintList(ColorStateList.valueOf(getColor(R.color.ocre)));
        FrameLayout.LayoutParams sp = new FrameLayout.LayoutParams(dp(36), dp(36));
        sp.gravity = Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM;
        sp.bottomMargin = dp(72);
        box.addView(spinner, sp);
        return box;
    }

    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(s.getUserAgentString() + " TondraagaApp/" + appVersion());

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new ShopClient());
        web.setWebChromeClient(new ShopChrome());
        // invoices and other documents: hand them to the browser / download manager
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long length) {
                openExternal(url);
            }
        });
    }

    private String startUrl(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        if (data != null && isSiteHost(data.getHost())) {
            return data.toString();
        }
        return HOME;
    }

    private static boolean isSiteHost(String host) {
        return host != null && (host.equals(SITE_DOMAIN) || host.endsWith("." + SITE_DOMAIN));
    }

    /** Returns true when the URL is handled outside the WebView. */
    private boolean route(String url) {
        if (url == null) return false;
        if (url.startsWith("tdg://reessayer")) {
            retry();
            return true;
        }
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if (scheme.equals("http") || scheme.equals("https")) {
            if (isSiteHost(uri.getHost())) return false;     // the shop stays in the app
            openExternal(url);                                // WhatsApp (wa.me), maps, social networks...
            return true;
        }
        if (scheme.equals("intent")) {
            try {
                Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
                startActivity(intent);
            } catch (Exception e) {
                String fallback = null;
                try {
                    fallback = Intent.parseUri(url, Intent.URI_INTENT_SCHEME).getStringExtra("browser_fallback_url");
                } catch (Exception ignored) {
                    // malformed intent URL: nothing to fall back to
                }
                if (fallback != null) web.loadUrl(fallback); else toast(R.string.no_app);
            }
            return true;
        }
        if (scheme.equals("file") || scheme.equals("about") || scheme.equals("data") || scheme.equals("javascript")) {
            return false;
        }
        openExternal(url);                                    // tel:, mailto:, sms:, whatsapp:, geo:, market:...
        return true;
    }

    private void openExternal(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            toast(R.string.no_app);
        }
    }

    private void retry() {
        String target = failedUrl != null ? failedUrl : HOME;
        failedUrl = null;
        web.loadUrl(target);
    }

    private void hideSplash() {
        if (splash.getVisibility() != View.VISIBLE) return;
        splash.animate().alpha(0f).setDuration(280).withEndAction(new Runnable() {
            @Override
            public void run() {
                splash.setVisibility(View.GONE);
            }
        }).start();
    }

    private class ShopClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            // embedded frames (maps, videos, payment widgets) always load in place
            return request.isForMainFrame() && route(request.getUrl().toString());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return route(url);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            progress.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progress.setVisibility(View.GONE);
            CookieManager.getInstance().flush();
            if (url != null && !url.startsWith("about:")) hideSplash();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showOffline(request.getUrl().toString());
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) showOffline(failingUrl);
        }
    }

    private void showOffline(String url) {
        if (url != null && !url.startsWith(OFFLINE_PAGE)) failedUrl = url;
        web.loadUrl(OFFLINE_PAGE);
        hideSplash();
    }

    private class ShopChrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progress.setProgress(newProgress);
            if (newProgress >= 100) progress.setVisibility(View.GONE);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                Intent pick = params.createIntent();
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(pick, null), REQ_FILE);
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                toast(R.string.no_app);
                return false;
            }
            return true;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (!isSiteHost(Uri.parse(origin).getHost())) {
                callback.invoke(origin, false, false);
                return;
            }
            if (hasLocationPermission()) {
                callback.invoke(origin, true, false);
            } else {
                geoOrigin = origin;
                geoCallback = callback;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
            }
        }
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION && geoCallback != null) {
            geoCallback.invoke(geoOrigin, hasLocationPermission(), false);
            geoCallback = null;
            geoOrigin = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent.getData() != null) web.loadUrl(startUrl(intent));
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
            return;
        }
        long now = System.currentTimeMillis();
        if (now - lastBackPress < 2000) {
            super.onBackPressed();
        } else {
            lastBackPress = now;
            toast(R.string.exit_hint);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        web.destroy();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "1";
        }
    }

    private void toast(int text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }
}
