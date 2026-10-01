package com.sobcontrole.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class SaldoWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_saldo);

        // Lê o saldo das SharedPreferences salvas pelo Capacitor Storage
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String saldoStr = prefs.getString("widget_saldo_em_contas", "R$ 0,00");
        String labelStr = prefs.getString("widget_label_saldo", "Saldo em Contas");

        views.setTextViewText(R.id.widget_value_saldo, saldoStr);
        views.setTextViewText(R.id.widget_label_saldo, labelStr);

        // Intent para abrir o aplicativo na tela principal ao tocar no botão do widget
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_button_open, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
