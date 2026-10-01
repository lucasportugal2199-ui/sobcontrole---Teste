import { Preferences } from '@capacitor/preferences';

/**
 * Sincroniza os dados de saldo com o SharedPreferences do Android para que
 * o Widget NATIVO da Tela Inicial exiba as informações atualizadas.
 */
export const syncWidgetData = async (
  saldoFormatted: string,
  label: string = 'Saldo em Contas',
  gastosHojeFormatted: string = 'R$ 0,00',
  previsaoFimMesFormatted: string = 'R$ 0,00'
) => {
  try {
    await Preferences.set({ key: 'widget_saldo_em_contas', value: saldoFormatted });
    await Preferences.set({ key: 'widget_label_saldo', value: label });
    await Preferences.set({ key: 'widget_gastos_hoje', value: gastosHojeFormatted });
    await Preferences.set({ key: 'widget_previsao_fim_mes', value: previsaoFimMesFormatted });
  } catch (error) {
    console.warn('Não foi possível sincronizar os dados com o Widget Android:', error);
  }
};
