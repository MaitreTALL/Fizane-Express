package com.tondraaga.app;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
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
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

/**
 * Tondraaga: the shop boutique.visionaryentreprises.com in a full-screen WebView,
 * with an animated splash, an offline page, file upload (payment proofs), location
 * for delivery pricing, and external apps for WhatsApp, phone and other sites.
 *
 * Security: only the shop itself is shown in the app (HTTPS, no mixed content,
 * no access to local files or content providers, no third-party cookies); other
 * sites open in the browser and only well-known link types open other apps.
 */
public class MainActivity extends Activity {

    private static final String HOME = "https://boutique.visionaryentreprises.com/";
    private static final String SITE_HOST = "boutique.visionaryentreprises.com";
    private static final String OFFLINE_PAGE = "file:///android_asset/offline.html";
    private static final int REQ_FILE = 1;
    private static final int REQ_LOCATION = 2;
    private static final long SPLASH_MIN_MS = 1500;

    private WebView web;
    private ProgressBar progress;
    private View splash;
    private View splashHalo;
    private View splashLogo;
    private final View[] splashDots = new View[3];
    private final ObjectAnimator[] dotAnimators = new ObjectAnimator[3];
    private long splashShownAt;
    private boolean splashHiding;
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
            playSplash();
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

    /** Cream screen with a soft ochre halo, the logo and three pulsing dots. */
    private View buildSplash() {
        FrameLayout box = new FrameLayout(this);
        box.setBackgroundColor(getColor(R.color.creme));
        box.setClickable(true);

        splashHalo = new View(this);
        GradientDrawable halo = new GradientDrawable();
        halo.setShape(GradientDrawable.OVAL);
        halo.setColor(getColor(R.color.ocre_pale));
        splashHalo.setBackground(halo);
        FrameLayout.LayoutParams hp = new FrameLayout.LayoutParams(dp(300), dp(300));
        hp.gravity = Gravity.CENTER;
        box.addView(splashHalo, hp);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo_splash);
        logo.setAdjustViewBounds(true);
        logo.setContentDescription(getString(R.string.app_name));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(dp(240), ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER;
        box.addView(logo, lp);
        splashLogo = logo;

        LinearLayout dots = new LinearLayout(this);
        dots.setOrientation(LinearLayout.HORIZONTAL);
        for (int i = 0; i < splashDots.length; i++) {
            View dot = new View(this);
            GradientDrawable d = new GradientDrawable();
            d.setShape(GradientDrawable.OVAL);
            d.setColor(getColor(R.color.ocre));
            dot.setBackground(d);
            LinearLayout.LayoutParams dl = new LinearLayout.LayoutParams(dp(10), dp(10));
            dl.leftMargin = dp(5);
            dl.rightMargin = dp(5);
            dots.addView(dot, dl);
            splashDots[i] = dot;
        }
        FrameLayout.LayoutParams sp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sp.gravity = Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM;
        sp.bottomMargin = dp(88);
        box.addView(dots, sp);
        return box;
    }

    /** Launch animation: the halo opens, the logo pops in, then the dots pulse while the shop loads. */
    private void playSplash() {
        splashShownAt = System.currentTimeMillis();

        splashHalo.setScaleX(0.2f);
        splashHalo.setScaleY(0.2f);
        splashHalo.setAlpha(0f);
        splashHalo.animate().scaleX(1f).scaleY(1f).alpha(1f)
                .setDuration(750).setInterpolator(new DecelerateInterpolator(1.6f)).start();

        splashLogo.setAlpha(0f);
        splashLogo.setScaleX(0.78f);
        splashLogo.setScaleY(0.78f);
        splashLogo.setTranslationY(dp(18));
        splashLogo.animate().alpha(1f).scaleX(1f).scaleY(1f).translationY(0f)
                .setStartDelay(180).setDuration(700).setInterpolator(new OvershootInterpolator(1.5f)).start();

        for (int i = 0; i < splashDots.length; i++) {
            View dot = splashDots[i];
            dot.setAlpha(0f);
            ObjectAnimator a = ObjectAnimator.ofFloat(dot, View.ALPHA, 0.2f, 1f);
            a.setDuration(520);
            a.setRepeatMode(ValueAnimator.REVERSE);
            a.setRepeatCount(ValueAnimator.INFINITE);
            a.setStartDelay(950 + i * 170L);
            a.start();
            dotAnimators[i] = a;
        }
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
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " TondraagaApp/" + appVersion());

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, false);

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
        if (data != null && "https".equalsIgnoreCase(data.getScheme()) && isSiteHost(data.getHost())) {
            return data.toString();
        }
        return HOME;
    }

    private static boolean isSiteHost(String host) {
        return host != null && host.equalsIgnoreCase(SITE_HOST);
    }

    /** Link types that may open another app (phone, e-mail, SMS, WhatsApp, maps, store). */
    private static boolean isAllowedExternalScheme(String scheme) {
        switch (scheme) {
            case "http":
            case "https":
            case "tel":
            case "mailto":
            case "sms":
            case "smsto":
            case "whatsapp":
            case "geo":
            case "market":
                return true;
            default:
                return false;
        }
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
        if (scheme.equals("https") && isSiteHost(uri.getHost())) return false;   // the shop stays in the app
        if (scheme.equals("http") || scheme.equals("https")) {
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
        if (url.equals(OFFLINE_PAGE) || url.equals("about:blank")) {
            return false;
        }
        if (isAllowedExternalScheme(scheme)) {
            openExternal(url);                                // tel:, mailto:, sms:, whatsapp:, geo:, market:
        }
        return true;                                          // file:, content:, data:, javascript:... are never opened
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

    /** Lets the launch animation finish (at least SPLASH_MIN_MS), then fades the splash out. */
    private void hideSplash() {
        if (splash.getVisibility() != View.VISIBLE || splashHiding) return;
        splashHiding = true;
        long wait = Math.max(0, SPLASH_MIN_MS - (System.currentTimeMillis() - splashShownAt));
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                splash.animate().alpha(0f).scaleX(1.06f).scaleY(1.06f).setDuration(320)
                        .setInterpolator(new DecelerateInterpolator()).withEndAction(new Runnable() {
                            @Override
                            public void run() {
                                splash.setVisibility(View.GONE);
                                for (ObjectAnimator a : dotAnimators) {
                                    if (a != null) a.cancel();
                                }
                            }
                        }).start();
            }
        }, wait);
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
        for (ObjectAnimator a : dotAnimators) {
            if (a != null) a.cancel();
        }
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
