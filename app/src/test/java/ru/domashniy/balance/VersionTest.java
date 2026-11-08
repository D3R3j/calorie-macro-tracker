package ru.domashniy.balance;
import org.junit.Test;
import static org.junit.Assert.*;
public class VersionTest {
    @Test public void comparesNumbersInsteadOfStrings(){assertTrue(Version.isNewer("v1.10.0","1.9.0"));assertTrue(Version.isNewer("2.0.0","1.9.9"));assertFalse(Version.isNewer("1.0.0","1.0.0"));assertFalse(Version.isNewer("v0.9.9","1.0.0"));}
    @Test(expected=IllegalArgumentException.class) public void rejectsPrereleases(){Version.isNewer("v2.0.0-beta","1.0.0");}
}
