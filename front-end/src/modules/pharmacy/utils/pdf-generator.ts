import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const StorageAccessFramework = Platform.OS === 'android' ? (FileSystem as any).StorageAccessFramework : null;
const SAVE_DIR_KEY = '@pdf_save_dir_uri';
const APP_NAME = 'تبارك فارما';

export const pdfGenerator = {
  getBrandingImages: async () => {
    try {
      const { Asset } = await import('expo-asset');
      // Using direct relative paths to assets
      const logoAsset = Asset.fromModule(require('../../../../assets/images/logo.png'));
      const bgAsset = Asset.fromModule(require('../../../../assets/images/android-icon-background.png'));
      
      await Promise.all([logoAsset.downloadAsync(), bgAsset.downloadAsync()]);
      
      const logoBase64 = await FileSystem.readAsStringAsync(logoAsset.localUri || logoAsset.uri, { encoding: 'base64' });
      const bgBase64 = await FileSystem.readAsStringAsync(bgAsset.localUri || bgAsset.uri, { encoding: 'base64' });
      
      return {
        logo: `data:image/png;base64,${logoBase64}`,
        bg: `data:image/png;base64,${bgBase64}`
      };
    } catch (e) {
      console.error("PDF: getBrandingImages failed", e);
      return { logo: null, bg: null };
    }
  },

  generateInvoiceHtml: (title: string, invoice: any, theme: any, branding?: { logo: string | null, bg: string | null }) => {
    const accentColor = theme.primary || '#4CAF50';
    const textColor = theme.text || '#2c3e50';
    const bgColor = theme.background || '#f8f9fa';
    const surfaceColor = theme.surface || '#ffffff';
    const mutedColor = theme.muted || '#adb5bd';
    const borderColor = theme.border || '#f1f3f5';
    const cardColor = theme.card || '#fdfdfd';

    return `
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Cairo', Tahoma, sans-serif; padding: 20px; color: ${textColor}; background-color: ${bgColor}; margin: 0; min-height: 100vh; }
            
            .invoice-wrap { max-width: 850px; margin: 0 auto; background: ${surfaceColor}; padding: 30px; border-radius: 24px; position: relative; }
            
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
            .header-title h1 { color: ${accentColor}; margin: 0 0 4px 0; font-size: 28px; font-weight: 900; }
            .header-title p { color: ${mutedColor}; font-size: 13px; margin: 0; font-weight: 700; }
            
            .header-logo-container { 
                width: 70px; height: 70px; border-radius: 18px; 
                display: flex; align-items: center; justify-content: center; 
                overflow: hidden; 
                ${branding?.bg ? `background-image: url('${branding.bg}'); background-size: cover;` : `background: ${accentColor};`}
            }
            .header-logo-img { width: 80%; height: 80%; object-fit: contain; }
            .header-logo-box { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 900; }
            
            .meta-card { background: ${cardColor}; padding: 20px; border-radius: 20px; border: 1px solid ${borderColor}; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .meta-group { display: flex; gap: 30px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 10px; color: ${mutedColor}; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
            .meta-value { font-size: 15px; font-weight: 800; color: ${textColor}; }
            
            .packing-row { display: flex; gap: 15px; background: ${accentColor}12; padding: 10px 15px; border-radius: 12px; border: 1px solid ${accentColor}25; }
            .packing-item { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: ${textColor}; }
            .packing-icon { font-size: 16px; width: 24px; text-align: center; }

            .items-container { margin-bottom: 30px; }
            .item-card { background: ${surfaceColor}; border: 1px solid ${borderColor}; border-radius: 18px; padding: 15px; margin-bottom: 12px; }
            .item-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${borderColor}; padding-bottom: 10px; margin-bottom: 12px; }
            .item-name { font-size: 16px; font-weight: 800; color: ${textColor}; }
            .return-badge { background: #fff0ed; color: #ff7043; font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 8px; }
            
            .item-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }
            .grid-col { display: flex; flex-direction: column; gap: 4px; }
            .grid-label { font-size: 10px; color: ${mutedColor}; font-weight: 700; }
            .grid-value { font-size: 14px; font-weight: 700; color: ${textColor}; }
            .grid-total { color: ${accentColor}; font-weight: 900; }
            
            .summary-section { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: ${cardColor}; border-top: 2px dashed ${borderColor}; margin-top: 10px; border-radius: 0 0 24px 24px; }
            .summary-label { font-size: 18px; font-weight: 900; color: ${textColor}; }
            .summary-value { font-size: 24px; font-weight: 900; color: ${accentColor}; }
            
            .footer-note { text-align: center; margin-top: 40px; color: ${mutedColor}; font-size: 12px; font-weight: 700; }
        </style>
    </head>
    <body>
        ${branding?.bg ? '<div class="page-bg"></div>' : ''}
        <div class="invoice-wrap">
            <div class="header">
                <div class="header-title">
                    <h1>${title}</h1>
                    <p style="font-size: 16px;">صيدلية: ${invoice.pharmacy_name || invoice.supplier || 'غير معروف'}</p>
                    <p style="color: ${accentColor}; font-weight: 800; font-size: 14px; margin-top: 4px;">رقم الفاتورة: #${String(invoice.id).replace('H_', '')}</p>
                </div>
                ${branding?.logo ? `
                <div class="header-logo-container">
                    <img src="${branding.logo}" class="header-logo-img" />
                </div>
                ` : `<div class="header-logo-box">T</div>`}
            </div>
            
            <div class="items-container">
                ${invoice.itemsList?.map((item: any) => `
                    <div class="item-card">
                        <div class="item-header">
                            <span class="item-name">${item.name}</span>
                            ${item.return_id ? '<span class="return-badge">مرتجع</span>' : ''}
                        </div>
                        <div class="item-grid">
                            <div class="grid-col">
                                <span class="grid-label">الكمية</span>
                                <span class="grid-value">${Number(item.qty).toLocaleString('en-US')}</span>
                            </div>
                            <div class="grid-col">
                                <span class="grid-label">السعر</span>
                                <span class="grid-value">${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="grid-col">
                                <span class="grid-label">الخصم</span>
                                <span class="grid-value" style="color: #e03131;">%${Number(item.discount).toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="grid-col">
                                <span class="grid-label">الإجمالي</span>
                                <span class="grid-value grid-total">${Number(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="summary-section">
                <span class="summary-label">إجمالي الفاتورة النهائية</span>
                <span class="summary-value">${Number(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</span>
            </div>
            
            <div class="footer-note">
                <p>مستخرج آلياً من تطبيق ${APP_NAME}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  },

  generateStatementHtml: (pharmacyName: string, balance: any, statement: any[], periodLabel: string, theme: any, branding?: { logo: string | null, bg: string | null }) => {
    const accentColor = theme.primary || '#4CAF50';
    const textColor = theme.text || '#2c3e50';
    const bgColor = theme.background || '#f8f9fa';
    const surfaceColor = theme.surface || '#ffffff';
    const mutedColor = theme.muted || '#adb5bd';
    const borderColor = theme.border || '#f1f3f5';
    const cardColor = theme.card || '#fdfdfd';

    return `
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Cairo', Tahoma, sans-serif; padding: 20px; color: ${textColor}; background-color: ${bgColor}; margin: 0; min-height: 100vh; }

            .statement-wrap { max-width: 900px; margin: 0 auto; background: ${surfaceColor}; padding: 30px; border-radius: 24px; position: relative; }
            
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
            .header-title h1 { color: ${accentColor}; margin: 0 0 4px 0; font-size: 28px; font-weight: 900; }
            .header-title p { color: ${mutedColor}; font-size: 13px; margin: 0; font-weight: 700; }
            
            .header-logo-container { 
                width: 70px; height: 70px; border-radius: 18px; 
                display: flex; align-items: center; justify-content: center; 
                overflow: hidden; 
                ${branding?.bg ? `background-image: url('${branding.bg}'); background-size: cover;` : `background: ${accentColor};`}
            }
            .header-logo-img { width: 80%; height: 80%; object-fit: contain; }
            .header-logo-box { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 900; }
            
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-card { background: ${cardColor}; padding: 15px 20px; border-radius: 20px; border: 1px solid ${borderColor}; }
            .card-label { font-size: 10px; color: ${mutedColor}; font-weight: 800; margin-bottom: 4px; text-transform: uppercase; }
            .card-value { font-size: 16px; font-weight: 900; color: ${textColor}; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 16px; overflow: hidden; border: 1px solid ${borderColor}; }
            th { background-color: ${cardColor}; color: ${textColor}; font-weight: 800; font-size: 12px; padding: 15px; text-align: right; border-bottom: 2px solid ${borderColor}; }
            td { padding: 15px; text-align: right; font-size: 13px; font-weight: 700; color: ${textColor}; border-bottom: 1px solid ${borderColor}; }
            tr:last-child td { border-bottom: none; }
            tr:nth-child(even) td { background-color: ${cardColor}; opacity: 0.8; }
            
            .type-badge { font-size: 11px; font-weight: 900; color: ${textColor}; }
            .debit { color: #e53935; }
            .credit { color: #43a047; }
            .balance { color: ${textColor}; font-weight: 900; }
            
            .footer-note { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid ${borderColor}; color: ${mutedColor}; font-size: 12px; font-weight: 700; }
        </style>
    </head>
    <body>
        ${branding?.bg ? '<div class="page-bg"></div>' : ''}
        <div class="statement-wrap">
            <div class="header">
                <div class="header-title">
                    <h1>كشف حساب تفصيلي</h1>
                    <p>الموجز: ${periodLabel}</p>
                    <p>صيدلية: ${pharmacyName || 'غير معروف'}</p>
                </div>
                ${branding?.logo ? `
                <div class="header-logo-container">
                    <img src="${branding.logo}" class="header-logo-img" />
                </div>
                ` : `<div class="header-logo-box">T</div>`}
            </div>
            
            <div class="summary-cards">
                <div class="summary-card">
                    <span class="card-label">الرصيد النهائي</span>
                    <span class="card-value" style="color: ${balance?.balance_type === 'Debit' ? '#e53935' : '#43a047'};">
                        ${Number(balance?.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                    </span>
                </div>
                <div class="summary-card">
                    <span class="card-label">حالة الحساب</span>
                    <span class="card-value">${(balance?.current_balance || 0) > 0 ? (balance?.balance_type === 'Debit' ? 'مدين لك' : 'دائن لنا') : 'متعادل'}</span>
                </div>
                <div class="summary-card">
                    <span class="card-label">تاريخ الاستخراج</span>
                    <span class="card-value">${new Date().toLocaleDateString('en-US')}</span>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th width="15%">التاريخ</th>
                        <th width="25%">البيان</th>
                        <th width="15%"> المرجع</th>
                        <th width="15%">مدين (+)</th>
                        <th width="15%">دائن (-)</th>
                        <th width="15%">الرصيد</th>
                    </tr>
                </thead>
                <tbody>
                    ${statement.slice(0, 1000).map((item: any) => `
                        <tr>
                            <td style="color: #868e96;">${item.date}</td>
                            <td><span class="type-badge">${item.type || 'حركة حساب'}</span></td>
                            <td style="color: #adb5bd;">#${String(item.ref_id).replace('H_', '') || '-'}</td>
                            <td class="debit">${item.debit > 0 ? item.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                            <td class="credit">${item.credit > 0 ? item.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                            <td class="balance">${item.balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer-note">
                <p>مستخرج آلياً من تطبيق ${APP_NAME}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  },

  ensureSaveDirAuthorized: async () => {
    if (Platform.OS !== 'android' || !StorageAccessFramework) return true; // Not applicable or not supported
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      let targetDir = await AsyncStorage.getItem(SAVE_DIR_KEY);
      
      // If we have it and it's valid, return true
      if (targetDir) {
        try {
          await StorageAccessFramework.readDirectoryAsync(targetDir);
          return true;
        } catch (e) {
          await AsyncStorage.removeItem(SAVE_DIR_KEY);
          targetDir = null;
        }
      }

      // Request new permission
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const selectedUri = permissions.directoryUri;
        // We use the selected folder directly. This avoids "double folders" 
        // and works better with Android's restrictions on root Downloads.
        await AsyncStorage.setItem(SAVE_DIR_KEY, selectedUri);
        return true;
      }
      return false;
    } catch (e) {
      console.error("PDF: ensureSaveDirAuthorized failed", e);
      return false;
    }
  },

  isDirAuthorized: async () => {
    if (Platform.OS !== 'android' || !StorageAccessFramework) return true;
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const targetDir = await AsyncStorage.getItem(SAVE_DIR_KEY);
      if (!targetDir) return false;
      await StorageAccessFramework.readDirectoryAsync(targetDir);
      return true;
    } catch (e) {
      return false;
    }
  },

  saveToDevice: async (tempPdfUri: string, fileNamePrefix?: string) => {
    try {
      const fileName = fileNamePrefix 
        ? `${String(fileNamePrefix).replace(/[^a-z0-9_\u0600-\u06FF]/gi, '_')}.pdf`
        : `${APP_NAME.replace(/\s+/g, '_')}.pdf`;

      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      let targetDir = await AsyncStorage.getItem(SAVE_DIR_KEY);

      // If we are on Android and don't have a target dir authorized yet, try to get it now
      if (Platform.OS === 'android' && !targetDir && StorageAccessFramework) {
          const authorized = await pdfGenerator.ensureSaveDirAuthorized();
          if (authorized) {
              targetDir = await AsyncStorage.getItem(SAVE_DIR_KEY);
          }
      }

      // If we have a target dir authorized, save there directly
      if (Platform.OS === 'android' && targetDir && StorageAccessFramework) {
          try {
              const base64 = await FileSystem.readAsStringAsync(tempPdfUri, { 
                  encoding: FileSystem.EncodingType.Base64
              });
              const createdFileUri = await StorageAccessFramework.createFileAsync(
                  targetDir as string, fileName, 'application/pdf'
              );
              await FileSystem.writeAsStringAsync(createdFileUri, base64, { 
                  encoding: FileSystem.EncodingType.Base64
              });
              return true;
          } catch (e) {
              console.error("PDF: Direct save failed, falling back to Sharing", e);
          }
      }

      // NO targetDir or failed? Use Sharing (This is much more seamless than the picker)
      await Sharing.shareAsync(tempPdfUri, {
          dialogTitle: 'حفظ الملف',
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf'
      });
      return true;
    } catch (e) {
      console.error("PDF: saveToDevice (via Sharing fallback) failed", e);
      return false;
    }
  },

  share: async (tempPdfUri: string) => {
    try {
      await Sharing.shareAsync(tempPdfUri);
    } catch (e) {
      console.error("PDF: share failed", e);
    }
  }
};
