/** Counts attempts per key in a time window. Expired rows are removed as new ones are counted. */
public without sharing class RateLimitService {
  public class Request {
    public String key;
    public Integer max;
    public Integer windowMinutes;
  }

  public class Result {
    public Boolean allowed;
  }

  public static Result check(Request request) {
    if (
      String.isBlank(request.key) ||
      request.key.length() > 64 ||
      request.max == null ||
      request.max < 1 ||
      request.windowMinutes == null ||
      request.windowMinutes < 1
    ) {
      throw new ShopException(ShopException.VALIDATION, 'key, max and windowMinutes are required.');
    }
    Result result = new Result();
    Datetime now = System.now();
    List<Rate_Limit__c> rows = lock(request.key);
    if (rows.isEmpty()) {
      Rate_Limit__c row = new Rate_Limit__c(
        Key__c = request.key,
        Count__c = 1,
        Resets_At__c = now.addMinutes(request.windowMinutes)
      );
      if (Database.insert(row, false).isSuccess()) {
        result.allowed = true;
        removeExpired(now);
        return result;
      }
      rows = lock(request.key); // Another request created the row first.
    }
    if (rows.isEmpty()) {
      throw new ShopException(ShopException.INTERNAL, 'The limit could not be checked.');
    }
    Rate_Limit__c row = rows[0];
    if (row.Resets_At__c <= now) {
      row.Count__c = 0;
      row.Resets_At__c = now.addMinutes(request.windowMinutes);
    }
    result.allowed = row.Count__c < request.max;
    if (result.allowed) {
      row.Count__c += 1;
      update row;
    }
    return result;
  }

  private static List<Rate_Limit__c> lock(String key) {
    return [SELECT Id, Count__c, Resets_At__c FROM Rate_Limit__c WHERE Key__c = :key LIMIT 1 FOR UPDATE];
  }

  private static void removeExpired(Datetime now) {
    List<Rate_Limit__c> old = [SELECT Id FROM Rate_Limit__c WHERE Resets_At__c < :now LIMIT 100];
    if (!old.isEmpty()) {
      Database.delete(old, false);
      Database.emptyRecycleBin(old);
    }
  }
}
