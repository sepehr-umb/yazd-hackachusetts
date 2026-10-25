package app.yazd.assistant;

import android.Manifest;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String[] PERMISSIONS = {
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.CALL_PHONE,
        Manifest.permission.READ_CONTACTS
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YazdDevicePlugin.class);
        super.onCreate(savedInstanceState);
        ActivityCompat.requestPermissions(this, PERMISSIONS, 1);
    }
}
