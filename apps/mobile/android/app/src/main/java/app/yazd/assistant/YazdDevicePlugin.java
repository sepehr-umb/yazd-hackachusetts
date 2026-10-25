package app.yazd.assistant;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "YazdDevice",
    permissions = {
        @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "phone"),
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts")
    }
)
public class YazdDevicePlugin extends Plugin {

    private static final String WHATSAPP = "com.whatsapp";
    private static final String VOIP_CALL = "vnd.android.cursor.item/vnd.com.whatsapp.voip.call";

    @PluginMethod
    public void perform(PluginCall call) {
        String action = call.getString("action", "");
        String phone = call.getString("phone", "");
        if (digits(phone).isEmpty()) {
            call.reject("Missing phone number");
            return;
        }
        switch (action) {
            case "phone_call":
                withPermission("phone", call, "afterPhonePermission");
                break;
            case "whatsapp_call":
                withPermission("contacts", call, "afterContactsPermission");
                break;
            case "whatsapp_message":
                openChat(call, call.getString("text", ""));
                break;
            default:
                call.reject("Unknown action " + action);
        }
    }

    private void withPermission(String alias, PluginCall call, String callback) {
        if (getPermissionState(alias) == PermissionState.GRANTED) {
            continueAfter(alias, call);
        } else {
            requestPermissionForAlias(alias, call, callback);
        }
    }

    @PermissionCallback
    private void afterPhonePermission(PluginCall call) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            continueAfter("phone", call);
        } else {
            call.reject("Phone permission denied");
        }
    }

    @PermissionCallback
    private void afterContactsPermission(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            continueAfter("contacts", call);
        } else {
            openChat(call, "");
        }
    }

    private void continueAfter(String alias, PluginCall call) {
        if (alias.equals("phone")) {
            placePhoneCall(call);
        } else {
            placeWhatsAppCall(call);
        }
    }

    private void placePhoneCall(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + call.getString("phone")));
        launch(intent, call, result("phone_call", true));
    }

    private void placeWhatsAppCall(PluginCall call) {
        String dataId = whatsAppCallId(digits(call.getString("phone")));
        if (dataId == null) {
            openChat(call, "");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse("content://com.android.contacts/data/" + dataId), VOIP_CALL);
        intent.setPackage(WHATSAPP);
        launch(intent, call, result("whatsapp_call", true));
    }

    private void openChat(PluginCall call, String text) {
        String url = "https://wa.me/" + digits(call.getString("phone"));
        if (!text.isEmpty()) {
            url += "?text=" + Uri.encode(text);
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.setPackage(WHATSAPP);
        launch(intent, call, result("whatsapp_chat", false));
    }

    private String whatsAppCallId(String phoneDigits) {
        String[] projection = { ContactsContract.Data._ID, ContactsContract.Data.DATA1 };
        String selection = ContactsContract.Data.MIMETYPE + " = ?";
        try (
            Cursor cursor = getContext()
                .getContentResolver()
                .query(ContactsContract.Data.CONTENT_URI, projection, selection, new String[] { VOIP_CALL }, null)
        ) {
            if (cursor == null) {
                return null;
            }
            while (cursor.moveToNext()) {
                String account = digits(cursor.getString(1));
                if (sameNumber(account, phoneDigits)) {
                    return cursor.getString(0);
                }
            }
        }
        return null;
    }

    private static boolean sameNumber(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) {
            return false;
        }
        return a.equals(b) || a.endsWith(b) || b.endsWith(a);
    }

    private static String digits(String value) {
        if (value == null) {
            return "";
        }
        int at = value.indexOf('@');
        String number = at >= 0 ? value.substring(0, at) : value;
        return number.replaceAll("[^0-9]", "");
    }

    private void launch(Intent intent, PluginCall call, JSObject result) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject("WhatsApp or the phone app is not installed");
        } catch (SecurityException error) {
            call.reject("Permission missing: " + error.getMessage());
        }
    }

    private static JSObject result(String opened, boolean placed) {
        JSObject result = new JSObject();
        result.put("opened", opened);
        result.put("placed", placed);
        return result;
    }
}
