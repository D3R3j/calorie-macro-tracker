package ru.domashniy.balance;

public final class Version {
    private Version(){}
    public static boolean isNewer(String remote,String current){
        String pattern="v?[0-9]{1,6}\\.[0-9]{1,6}\\.[0-9]{1,6}";
        if(!remote.matches(pattern)||!current.matches(pattern))throw new IllegalArgumentException("Неподдерживаемый формат версии. Ожидается v1.2.3.");
        String[] a=remote.replaceFirst("^v","").split("\\."),b=current.replaceFirst("^v","").split("\\.");
        for(int i=0;i<3;i++){int x=Integer.parseInt(a[i]),y=Integer.parseInt(b[i]);if(x!=y)return x>y;}return false;
    }
}
