package ru.domashniy.balance;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.*;
import android.widget.*;
import android.view.*;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;

public class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private WebView web;
    private LinearLayout appLayout;
    private File pendingApk;
    private boolean checking=false,downloading=false,pageIsReady=false,importInFlight=false,installPromptOpen=false,deferInstall=false;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout=new LinearLayout(this);appLayout=layout;layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(0xfff2f2f7);
        layout.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        web=new WebView(this);layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        WebSettings ws=web.getSettings();ws.setJavaScriptEnabled(true);ws.setDomStorageEnabled(true);ws.setAllowFileAccess(false);ws.setAllowContentAccess(false);ws.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        final WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){pageIsReady=false;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                WebResourceResponse response=loader.shouldInterceptRequest(request.getUrl());
                return response!=null?response:new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !request.getUrl().toString().startsWith(ORIGIN+"/assets/");}
            @Override public void onPageFinished(WebView view,String url){
                // Keep the native interface restricted to bundled, non-navigable content.
                if(!url.startsWith(ORIGIN+"/assets/"))return;
                view.evaluateJavascript("if(window.BalanceApp)AndroidFiles.pageReady()",null);
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){newAlert().setMessage(message).setPositiveButton("Да",(d,w)->result.confirm()).setNegativeButton("Отмена",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
        });
        web.addJavascriptInterface(new Object(){
            @JavascriptInterface public String getVersion(){return BuildConfig.VERSION_NAME;}
            @JavascriptInterface public void checkUpdates(){runOnUiThread(()->MainActivity.this.checkUpdates(true));}
            @JavascriptInterface public void setDarkMode(boolean dark){runOnUiThread(()->applyTheme(dark));}
            @JavascriptInterface public void openRepository(){runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://github.com/"+BuildConfig.UPDATE_REPO)));}catch(ActivityNotFoundException ex){message("На устройстве недоступен браузер.");}});}
            @JavascriptInterface public void exportJson(String data){if(data==null||data.length()>10000000)return;worker.execute(()->{try{writePending("pending-export.json",data);runOnUiThread(()->{if(isFinishing()||isDestroyed())return;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"domashniy-balans.json");startActivityForResult(i,10);});}catch(Exception ex){runOnUiThread(()->message("Не удалось подготовить копию: "+ex.getMessage()));}});}
            @JavascriptInterface public void importJson(){runOnUiThread(()->startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE),11));}
            @JavascriptInterface public void pageReady(){runOnUiThread(()->{pageIsReady=true;deliverPendingImport();});}
            @JavascriptInterface public void importFinished(){runOnUiThread(()->{new File(getFilesDir(),"pending-import.json").delete();importInFlight=false;});}
        },"AndroidFiles");
        applyTheme(getPreferences(0).getBoolean("darkMode",false));
        web.loadUrl(ORIGIN+"/assets/www/index.html");
        File update=new File(new File(getCacheDir(),"updates"),"update.apk");
        if(update.exists())worker.execute(()->{try{verifyApk(update);runOnUiThread(()->{pendingApk=update;offerInstall();});}catch(Exception ex){update.delete();}});
        else if(System.currentTimeMillis()-getPreferences(0).getLong("lastCheck",0)>86400000L)checkUpdates(false);
    }

    private AlertDialog.Builder newAlert(){return new AlertDialog.Builder(new ContextThemeWrapper(this,getPreferences(0).getBoolean("darkMode",false)?android.R.style.Theme_Material_Dialog_Alert:android.R.style.Theme_Material_Light_Dialog_Alert));}
    private void message(String text){if(!isFinishing()&&!isDestroyed())newAlert().setTitle("Обновления").setMessage(text).setPositiveButton("Понятно",null).show();}
    private void checkUpdates(boolean manual){
        if(pendingApk!=null){if(manual){deferInstall=false;offerInstall();}return;}
        if(downloading){if(manual)Toast.makeText(this,"Обновление уже загружается…",Toast.LENGTH_SHORT).show();return;}
        if(checking){if(manual)Toast.makeText(this,"Проверка уже выполняется…",Toast.LENGTH_SHORT).show();return;}checking=true;
        if(manual)Toast.makeText(this,"Проверяем GitHub…",Toast.LENGTH_SHORT).show();
        worker.execute(()->{try{
            HttpURLConnection conn=open("https://api.github.com/repos/"+BuildConfig.UPDATE_REPO+"/releases/latest");
            String body;try{if(conn.getResponseCode()==404)throw new IOException("Опубликованных версий пока нет.");if(conn.getResponseCode()!=200)throw new IOException("GitHub недоступен (код "+conn.getResponseCode()+"). Попробуйте позже.");body=new String(readBounded(conn.getInputStream(),2000000),StandardCharsets.UTF_8);}finally{conn.disconnect();}
            JSONObject release=new JSONObject(body);JSONArray assets=release.getJSONArray("assets");JSONObject apk=null;
            for(int n=0;n<assets.length();n++){JSONObject a=assets.getJSONObject(n);if(a.getString("name").equals("calorie-macro-tracker.apk"))apk=a;}
            if(apk==null)throw new IOException("В последнем релизе нет APK приложения.");
            String tag=release.getString("tag_name");
            if(!Version.isNewer(tag,BuildConfig.VERSION_NAME)){runOnUiThread(()->{if(manual)message("Установлена последняя версия: "+BuildConfig.VERSION_NAME);});}
            else {
                String url=apk.getString("browser_download_url"),digest=apk.optString("digest","");long size=apk.getLong("size");
                if(!url.startsWith("https://github.com/"+BuildConfig.UPDATE_REPO+"/releases/download/")||!digest.matches("sha256:[0-9a-fA-F]{64}")||size<=0||size>100000000)throw new IOException("Не удалось проверить сведения об APK. Обновление отменено.");
                runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())newAlert().setTitle("Доступна версия "+tag).setMessage("Установлена "+BuildConfig.VERSION_NAME+". Скачать обновление из "+BuildConfig.UPDATE_REPO+"? Дневник сохранится.").setNegativeButton("Позже",null).setPositiveButton("Скачать",(d,w)->download(url,digest,size)).show();});
            }
            getPreferences(0).edit().putLong("lastCheck",System.currentTimeMillis()).apply();
        }catch(Exception ex){if(manual)runOnUiThread(()->message(ex.getMessage()==null?"Не удалось проверить обновления. Проверьте подключение к интернету.":ex.getMessage()));}finally{runOnUiThread(()->checking=false);}});
    }

    private HttpURLConnection open(String url)throws IOException{
        URL parsed=new URL(url);if(!parsed.getProtocol().equals("https"))throw new IOException("Требуется HTTPS.");
        HttpURLConnection c=(HttpURLConnection)parsed.openConnection();c.setConnectTimeout(15000);c.setReadTimeout(30000);c.setRequestProperty("User-Agent","CalorieMacroTracker/"+BuildConfig.VERSION_NAME);c.setRequestProperty("Accept","application/vnd.github+json");return c;
    }
    private byte[] readBounded(InputStream stream,int max)throws IOException{try(InputStream in=stream;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int read;while((read=in.read(buffer))!=-1){if(out.size()+read>max)throw new IOException("Файл слишком большой.");out.write(buffer,0,read);}return out.toByteArray();}}
    private void download(String url,String digest,long expectedSize){
        if(downloading)return;downloading=true;
        Toast.makeText(this,"Загрузка обновления…",Toast.LENGTH_LONG).show();
        worker.execute(()->{File file=new File(new File(getCacheDir(),"updates"),"update.part.apk");try{
            file.getParentFile().mkdirs();MessageDigest hash=MessageDigest.getInstance("SHA-256");long total=0;HttpURLConnection c=open(url);c.setRequestProperty("Accept","application/octet-stream");
            try{if(c.getResponseCode()!=200)throw new IOException("Не удалось скачать APK.");try(InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(file)){byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1){total+=n;if(total>expectedSize)throw new IOException("Неверный размер APK.");hash.update(buf,0,n);out.write(buf,0,n);}}}finally{c.disconnect();}
            StringBuilder actual=new StringBuilder();for(byte b:hash.digest())actual.append(String.format(Locale.ROOT,"%02x",b&255));
            if(total!=expectedSize||!actual.toString().equalsIgnoreCase(digest.substring(7)))throw new IOException("Контрольная сумма APK не совпадает.");
            verifyApk(file);
            File ready=new File(file.getParentFile(),"update.apk");java.nio.file.Files.move(file.toPath(),ready.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            runOnUiThread(()->{pendingApk=ready;offerInstall();});
        }catch(Exception ex){file.delete();runOnUiThread(()->message("Обновление не установлено: "+ex.getMessage()));}finally{runOnUiThread(()->downloading=false);}});
    }
    @SuppressWarnings("deprecation") private void verifyApk(File file)throws Exception{
        PackageManager pm=getPackageManager();PackageInfo downloaded=pm.getPackageArchiveInfo(file.getAbsolutePath(),PackageManager.GET_SIGNATURES),installed=pm.getPackageInfo(getPackageName(),PackageManager.GET_SIGNATURES);
        if(downloaded==null||!getPackageName().equals(downloaded.packageName)||downloaded.versionCode<=installed.versionCode||downloaded.signatures==null||!Arrays.equals(downloaded.signatures,installed.signatures))throw new IOException("Неподходящий пакет, версия или подпись приложения.");
    }
    private void offerInstall(){
        if(isFinishing()||isDestroyed()||pendingApk==null||installPromptOpen||deferInstall)return;installPromptOpen=true;
        newAlert().setTitle("Обновление загружено").setMessage("Android запросит подтверждение установки. Если потребуется, разрешите установку из этого приложения.").setNegativeButton("Позже",(d,w)->deferInstall=true).setPositiveButton("Установить",(d,w)->{
            if(!getPackageManager().canRequestPackageInstalls()){startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())));return;}
            File apk=pendingApk;try{verifyApk(apk);}catch(Exception ex){pendingApk=null;apk.delete();message("APK больше не подходит для обновления.");return;}Intent i=new Intent(Intent.ACTION_VIEW).setDataAndType(FileProvider.getUriForFile(this,getPackageName()+".files",apk),"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            try{startActivity(i);}catch(ActivityNotFoundException ex){message("На устройстве недоступен установщик APK.");}
        }).setOnDismissListener(d->installPromptOpen=false).show();
    }
    @Override protected void onResume(){super.onResume();if(pendingApk!=null)offerInstall();}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null){if(request==10)new File(getFilesDir(),"pending-export.json").delete();return;}Uri uri=data.getData();
        worker.execute(()->{try{
            if(request==10){byte[] payload=readBounded(new FileInputStream(new File(getFilesDir(),"pending-export.json")),10000000);try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException("Не удалось открыть файл.");out.write(payload);}new File(getFilesDir(),"pending-export.json").delete();runOnUiThread(()->Toast.makeText(this,"Копия сохранена",Toast.LENGTH_SHORT).show());}
            if(request==11){String json=new String(readBounded(getContentResolver().openInputStream(uri),10000000),StandardCharsets.UTF_8);new JSONObject(json);writePending("pending-import.json",json);runOnUiThread(this::deliverPendingImport);}
        }catch(Exception ex){runOnUiThread(()->message("Не удалось обработать копию: "+ex.getMessage()));}});
    }
    private void writePending(String name,String data)throws IOException{File target=new File(getFilesDir(),name),temp=new File(getFilesDir(),name+".tmp");try(OutputStream out=new FileOutputStream(temp)){out.write(data.getBytes(StandardCharsets.UTF_8));}java.nio.file.Files.move(temp.toPath(),target.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);}
    private void deliverPendingImport(){
        File file=new File(getFilesDir(),"pending-import.json");if(!pageIsReady||importInFlight||!file.exists()||isDestroyed())return;importInFlight=true;
        worker.execute(()->{try{String json=new String(readBounded(new FileInputStream(file),10000000),StandardCharsets.UTF_8);String safe=JSONObject.quote(json);runOnUiThread(()->{if(isDestroyed())return;web.evaluateJavascript("(async()=>{try{await window.BalanceApp.importData("+safe+")}finally{AndroidFiles.importFinished()}})()",null);});}catch(Exception ex){runOnUiThread(()->{importInFlight=false;message("Не удалось прочитать копию: "+ex.getMessage());});}});
    }
    private void applyTheme(boolean dark){
        getPreferences(0).edit().putBoolean("darkMode",dark).apply();
        int background=dark?0xff000000:0xfff2f2f7;appLayout.setBackgroundColor(background);web.setBackgroundColor(background);
        getWindow().setStatusBarColor(background);getWindow().setNavigationBarColor(background);
        if(Build.VERSION.SDK_INT>=30){WindowInsetsController controller=getWindow().getInsetsController();if(controller!=null){int flags=WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;controller.setSystemBarsAppearance(dark?0:flags,flags);}}
        else getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }
    private void goBackOrExit(){if(web.canGoBack())web.goBack();else finish();}
    private void handleBack(){web.evaluateJavascript("(()=>{const dialog=[...document.querySelectorAll('dialog[open]')].pop();if(dialog){if(dialog.dispatchEvent(new Event('cancel',{cancelable:true})))dialog.close();return true}return window.BalanceApp?.goBack?.()||false})()",handled->{if(!"true".equals(handled))goBackOrExit();});}
    @Override public void onBackPressed(){handleBack();}
    @Override protected void onDestroy(){worker.shutdownNow();web.removeJavascriptInterface("AndroidFiles");web.destroy();super.onDestroy();}
}
