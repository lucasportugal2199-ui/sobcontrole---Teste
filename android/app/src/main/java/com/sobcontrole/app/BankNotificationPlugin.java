package com.sobcontrole.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "BankNotification")
public class BankNotificationPlugin extends Plugin {

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        Context context = getContext();
        String enabledListeners = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        String myPackage = context.getPackageName();

        boolean isGranted = false;
        if (!TextUtils.isEmpty(enabledListeners)) {
            String[] components = enabledListeners.split(":");
            for (String component : components) {
                ComponentName cn = ComponentName.unflattenFromString(component);
                if (cn != null && TextUtils.equals(myPackage, cn.getPackageName())) {
                    isGranted = true;
                    break;
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("granted", isGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Não foi possível abrir as configurações de notificação", e);
        }
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(BankNotificationListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(BankNotificationListenerService.KEY_ENABLED, true);
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        SharedPreferences prefs = getContext().getSharedPreferences(BankNotificationListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(BankNotificationListenerService.KEY_ENABLED, enabled).apply();
        call.resolve();
    }

    @PluginMethod
    public void getPendingTransactions(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(BankNotificationListenerService.PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(BankNotificationListenerService.KEY_PENDING, "[]");
            JSONArray array = new JSONArray(rawJson);

            JSArray result = new JSArray();
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                JSObject item = new JSObject();
                item.put("id", obj.optString("id"));
                item.put("valor", obj.optDouble("valor"));
                item.put("descricao", obj.optString("descricao"));
                item.put("tipo", obj.optString("tipo", "saida"));
                item.put("paymentMethod", obj.optString("paymentMethod", "debito"));
                item.put("bankName", obj.optString("bankName"));
                item.put("packageName", obj.optString("packageName"));
                item.put("timestamp", obj.optLong("timestamp"));
                result.put(item);
            }

            JSObject ret = new JSObject();
            ret.put("transactions", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao buscar transações pendentes", e);
        }
    }

    @PluginMethod
    public void clearPendingTransactions(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(BankNotificationListenerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(BankNotificationListenerService.KEY_PENDING, "[]").apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Erro ao limpar transações", e);
        }
    }
}
