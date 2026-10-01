package com.sobcontrole.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BankNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "BankNotification";
    public static final String PREFS_NAME = "sobcontrole_bank_listener_prefs";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_PENDING = "pending_transactions";
    private static final String CHANNEL_ID = "sobcontrole_bank_transactions";

    // Mapeamento dos principais apps bancários brasileiros
    private static final Map<String, String> BANK_PACKAGES = new HashMap<String, String>() {{
        put("com.nu.production", "Nubank");
        put("br.com.intermedium", "Inter");
        put("com.itau", "Itaú");
        put("com.itau.personnalite", "Itaú Personnalité");
        put("com.itau.cartoes", "Itaú Cartões");
        put("com.bradesco", "Bradesco");
        put("com.bradesco.cartoes", "Bradesco Cartões");
        put("com.bradesco.next", "Next");
        put("com.santander.app", "Santander");
        put("com.santander.way", "Santander Way");
        put("br.com.bb.android", "Banco do Brasil");
        put("br.com.caixa.atendimentomovel", "Caixa");
        put("com.c6bank.app", "C6 Bank");
        put("com.mercadopago.wallet", "Mercado Pago");
        put("com.picpay", "PicPay");
        put("br.com.uol.ps.myaccount", "PagBank");
        put("com.btg.pactual.banking", "BTG Pactual");
        put("br.com.neon", "Neon");
        put("com.willbank.app", "Will Bank");
    }};

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isEnabled = prefs.getBoolean(KEY_ENABLED, true);
        if (!isEnabled) return;

        String packageName = sbn.getPackageName();
        if (!BANK_PACKAGES.containsKey(packageName)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        CharSequence bigTextSeq = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence textSeq = extras.getCharSequence(Notification.EXTRA_TEXT);
        String text = bigTextSeq != null ? bigTextSeq.toString() : (textSeq != null ? textSeq.toString() : "");

        String fullContent = (title + " " + text).trim();
        if (fullContent.isEmpty()) return;

        Log.d(TAG, "Notificação de banco recebida (" + packageName + "): " + fullContent);

        // 1. Extração de valor monetário (ex: R$ 49,90 ou 49,90)
        Double valor = extrairValor(fullContent);
        if (valor == null || valor <= 0) return;

        // 2. Extração de estabelecimento / beneficiário
        String bankName = BANK_PACKAGES.get(packageName);
        String local = extrairEstabelecimento(fullContent);

        // 3. Determinação do método de pagamento (crédito, débito, pix)
        String metodo = extrairMetodo(fullContent);

        // 4. Salva a transação pendente em SharedPreferences para consumo do app
        salvarTransacaoPendente(valor, local, metodo, bankName, packageName);

        // 5. Lança notificação própria interativa para o usuário confirmar com 1 toque
        emitirNotificacaoSugestao(valor, local, metodo, bankName);
    }

    private Double extrairValor(String text) {
        try {
            // Padrão 1: Com R$ ou BRL (ex: R$ 1.250,50 ou R$ 45,90)
            Pattern p1 = Pattern.compile("(?:R\\$|BRL)\\s*([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})", Pattern.CASE_INSENSITIVE);
            Matcher m1 = p1.matcher(text);
            if (m1.find()) {
                String clean = m1.group(1).replace(".", "").replace(",", ".");
                return Double.parseDouble(clean);
            }

            // Padrão 2: Formato decimal comum (ex: R$ 45.90)
            Pattern p2 = Pattern.compile("(?:R\\$|BRL)\\s*([0-9]+[.,][0-9]{2})", Pattern.CASE_INSENSITIVE);
            Matcher m2 = p2.matcher(text);
            if (m2.find()) {
                String clean = m2.group(1).replace(",", ".");
                return Double.parseDouble(clean);
            }

            // Padrão 3: Palavras-chave financeiras seguidas de número
            Pattern p3 = Pattern.compile("(?:compra|valor|pagamento|transferiu|recebeu)\\s+(?:de\\s+)?([0-9]+[.,][0-9]{2})", Pattern.CASE_INSENSITIVE);
            Matcher m3 = p3.matcher(text);
            if (m3.find()) {
                String clean = m3.group(1).replace(",", ".");
                return Double.parseDouble(clean);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao extrair valor: " + e.getMessage());
        }
        return null;
    }

    private String extrairEstabelecimento(String text) {
        try {
            // Tenta pegar o que vem após "em ", "no ", "na ", "para "
            Pattern p = Pattern.compile("(?:em|no|na|para)\\s+([A-Za-z0-9\\s\\-._&]+?)(?:\\s+(?:no valor|às|as|com o cartão|no cartão|final|com sucesso|$|\\.|,))", Pattern.CASE_INSENSITIVE);
            Matcher m = p.matcher(text);
            if (m.find()) {
                String res = m.group(1).trim();
                if (res.length() > 2 && res.length() < 35) {
                    return res;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao extrair estabelecimento: " + e.getMessage());
        }
        return "Nova Compra";
    }

    private String extrairMetodo(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("crédito") || lower.contains("credito") || lower.contains("cartão") || lower.contains("cartao")) {
            return "credito";
        }
        if (lower.contains("pix")) {
            return "pix";
        }
        return "debito";
    }

    private void salvarTransacaoPendente(double valor, String desc, String metodo, String banco, String pkg) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_PENDING, "[]");
            JSONArray array = new JSONArray(rawJson);

            JSONObject item = new JSONObject();
            item.put("id", "bank-" + System.currentTimeMillis());
            item.put("valor", valor);
            item.put("descricao", desc);
            item.put("tipo", "saida");
            item.put("paymentMethod", metodo.equals("credito") ? "credito" : "debito");
            item.put("bankName", banco);
            item.put("packageName", pkg);
            item.put("timestamp", System.currentTimeMillis());

            array.put(item);
            prefs.edit().putString(KEY_PENDING, array.toString()).apply();
            Log.d(TAG, "Transação pendente salva: " + item.toString());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao salvar transação pendente: " + e.getMessage());
        }
    }

    private void emitirNotificacaoSugestao(double valor, String local, String metodo, String banco) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Sugestões de Compras Bancárias",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notificações para registro automático de despesas detectadas");
                channel.enableVibration(true);
                nm.createNotificationChannel(channel);
            }

            String valorFormatado = String.format("%.2f", valor).replace(".", ",");
            String deepLink = "sobcontrole://novo-lancamento?valor=" + valor + 
                "&desc=" + Uri.encode(local) + 
                "&tipo=saida" + 
                "&pagamento=" + (metodo.equals("credito") ? "credito" : "debito") +
                "&origem=notificacao_banco";

            Intent openAppIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int notifId = (int) (System.currentTimeMillis() % 100000);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notifId,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Registrar gasto de R$ " + valorFormatado + "?")
                .setContentText(local + " (" + banco + ")")
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(local + " • " + banco + "\nToque para registrar no SobControle."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .addAction(android.R.drawable.ic_input_add, "Registrar", pendingIntent);

            nm.notify(notifId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao emitir notificação de sugestão: " + e.getMessage());
        }
    }
}
