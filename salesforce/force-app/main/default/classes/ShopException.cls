/**
 * The one exception type thrown by Points Shop service classes.
 * `code` is one of the API error codes (see ShopApi.statusFor); ShopApi maps it to an HTTP status.
 */
public class ShopException extends Exception {
  public static final String VALIDATION = 'VALIDATION';
  public static final String UNAUTHORIZED = 'UNAUTHORIZED';
  public static final String NOT_FOUND = 'NOT_FOUND';
  public static final String INSUFFICIENT_POINTS = 'INSUFFICIENT_POINTS';
  public static final String TASK_LIMIT_REACHED = 'TASK_LIMIT_REACHED';
  public static final String INVALID_STATE = 'INVALID_STATE';
  public static final String INTERNAL = 'INTERNAL';

  public String code { get; private set; }

  public ShopException(String code, String message) {
    this.code = code;
    this.setMessage(message);
  }
}
