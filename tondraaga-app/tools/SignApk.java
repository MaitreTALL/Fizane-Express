import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/**
 * Signs an APK with the APK Signature Scheme v2 (enough for minSdk 24, Android 7.0+)
 * and verifies it. Uses Google's apksig library (com.android.tools.build:apksig);
 * its v1 (JAR) signer would need JDK 8 internals, and v1 is not needed from API 24.
 *
 *   java -cp apksig.jar:. SignApk <in.apk> <out.apk> <keystore.p12> <password-file> <alias>
 */
public class SignApk {
    public static void main(String[] args) throws Exception {
        File in = new File(args[0]), out = new File(args[1]), store = new File(args[2]);
        char[] pass = new String(Files.readAllBytes(new File(args[3]).toPath()), StandardCharsets.UTF_8).trim().toCharArray();
        String alias = args[4];

        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (InputStream is = new FileInputStream(store)) {
            ks.load(is, pass);
        }
        PrivateKey key = (PrivateKey) ks.getKey(alias, pass);
        X509Certificate cert = (X509Certificate) ks.getCertificate(alias);

        ApkSigner.SignerConfig signer = new ApkSigner.SignerConfig.Builder("TONDRAAG", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
                .setInputApk(in)
                .setOutputApk(out)
                .setMinSdkVersion(24)
                .setV1SigningEnabled(false)
                .setV2SigningEnabled(true)
                .setCreatedBy("Tondraaga")
                .build()
                .sign();

        ApkVerifier.Result r = new ApkVerifier.Builder(out).build().verify();
        System.out.println("verified: " + r.isVerified() + " (v1 " + r.isVerifiedUsingV1Scheme() + ", v2 " + r.isVerifiedUsingV2Scheme() + ")");
        for (Object e : r.getErrors()) System.out.println("error: " + e);
        for (Object w : r.getWarnings()) System.out.println("warning: " + w);
        if (!r.isVerified()) System.exit(1);
    }
}
