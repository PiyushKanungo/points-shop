/**
 * Points Shop REST API: /services/apexrest/shop/v1/...
 * Called only by the Next.js server as the integration user. Routes and JSON shapes follow the
 * design's section 4. Errors are returned as { "error": { "code", "message" } }.
 */
@RestResource(urlMapping='/shop/v1/*')
global with sharing class ShopApi {
  private static final String PREFIX = '/shop/v1/';

  @TestVisible
  private static Exception forceException;

  @HttpGet
  global static void doGet() {
    handle('GET');
  }

  @HttpPost
  global static void doPost() {
    handle('POST');
  }

  private static void handle(String method) {
    RestRequest req = RestContext.request;
    RestResponse res = RestContext.response;
    res.addHeader('Content-Type', 'application/json');
    try {
      if (forceException != null) {
        throw forceException;
      }
      Object body = route(method, segments(req.requestURI), req.requestBody);
      write(res, 200, body);
    } catch (ShopException e) {
      write(res, statusFor(e.code), ShopDtos.error(e.code, e.getMessage()));
    } catch (JSONException e) {
      write(
        res,
        400,
        ShopDtos.error(
          ShopException.VALIDATION,
          'The request body is not valid JSON for this endpoint.'
        )
      );
    } catch (Exception e) {
      System.debug(
        LoggingLevel.ERROR,
        'ShopApi ' + method + ' failed: ' + e.getMessage() + '\n' + e.getStackTraceString()
      );
      write(res, 500, ShopDtos.error(ShopException.INTERNAL, 'Something went wrong.'));
    }
  }

  @TestVisible
  private static Integer statusFor(String code) {
    switch on code {
      when 'VALIDATION' {
        return 400;
      }
      when 'UNAUTHORIZED' {
        return 401;
      }
      when 'NOT_FOUND' {
        return 404;
      }
      when 'INSUFFICIENT_POINTS', 'TASK_LIMIT_REACHED', 'INVALID_STATE' {
        return 409;
      }
      when else {
        return 500;
      }
    }
  }

  private static Object route(String method, List<String> path, Blob body) {
    Integer n = path.size();
    if (method == 'GET') {
      if (n == 1 && path[0] == 'catalog') {
        return CatalogService.getCatalog();
      }
      if (n >= 2 && path[0] == 'wallets') {
        Id walletId = toId(path[1], Wallet__c.SObjectType);
        if (n == 2) {
          return new Map<String, Object>{ 'wallet' => WalletService.getWallet(walletId) };
        }
        if (n == 3 && path[2] == 'orders') {
          return new Map<String, Object>{ 'orders' => OrderService.listOrders(walletId) };
        }
        if (n == 4 && path[2] == 'orders') {
          Id orderId = toId(path[3], Shop_Order__c.SObjectType);
          return new Map<String, Object>{ 'order' => OrderService.getOrder(walletId, orderId) };
        }
      }
    } else if (method == 'POST') {
      if (n == 2 && path[0] == 'auth' && path[1] == 'verify') {
        ShopDtos.VerifyRequest r = (ShopDtos.VerifyRequest) parse(
          body,
          ShopDtos.VerifyRequest.class,
          false
        );
        return WalletService.verifySignIn(r.email, r.issuedAt, r.referralCode);
      }
      if (n >= 3 && path[0] == 'wallets') {
        Id walletId = toId(path[1], Wallet__c.SObjectType);
        if (n == 4 && path[2] == 'tasks') {
          ShopDtos.TaskRequest r = (ShopDtos.TaskRequest) parse(
            body,
            ShopDtos.TaskRequest.class,
            true
          );
          return EarnService.completeTask(walletId, path[3], r.evidence);
        }
        if (n == 3 && path[2] == 'checkout') {
          ShopDtos.CheckoutRequest r = (ShopDtos.CheckoutRequest) parse(
            body,
            ShopDtos.CheckoutRequest.class,
            false
          );
          return CheckoutService.checkout(walletId, r.checkoutKey, r.offerings);
        }
        if (n == 5 && path[2] == 'orders') {
          return routeOrderAction(
            walletId,
            toId(path[3], Shop_Order__c.SObjectType),
            path[4],
            body
          );
        }
      }
    }
    throw new ShopException(ShopException.NOT_FOUND, 'No such endpoint.');
  }

  private static Object routeOrderAction(Id walletId, Id orderId, String action, Blob body) {
    if (action == 'details') {
      ShopDtos.DetailsRequest r = (ShopDtos.DetailsRequest) parse(
        body,
        ShopDtos.DetailsRequest.class,
        false
      );
      return new Map<String, Object>{
        'order' => OrderService.saveDetails(walletId, orderId, r.question, r.resumeUrl)
      };
    }
    if (action == 'booking') {
      ShopDtos.BookingRequest r = (ShopDtos.BookingRequest) parse(
        body,
        ShopDtos.BookingRequest.class,
        false
      );
      return new Map<String, Object>{
        'order' => OrderService.saveBooking(walletId, orderId, r.bookingUid, r.bookingStart)
      };
    }
    if (action == 'review') {
      ShopDtos.ReviewRequest r = (ShopDtos.ReviewRequest) parse(
        body,
        ShopDtos.ReviewRequest.class,
        false
      );
      ShopDtos.ReviewResult result = OrderService.submitReview(walletId, orderId, r.rating, r.text);
      return new Map<String, Object>{
        'order' => result.orderDto,
        'pointsAwarded' => result.pointsAwarded,
        'replay' => result.replay,
        'balance' => result.balance
      };
    }
    throw new ShopException(ShopException.NOT_FOUND, 'No such endpoint.');
  }

  @TestVisible
  private static List<String> segments(String requestUri) {
    List<String> result = new List<String>();
    if (requestUri == null) {
      return result;
    }
    String path = requestUri.substringBefore('?');
    Integer start = path.indexOf(PREFIX);
    if (start < 0) {
      return result;
    }
    for (String part : path.substring(start + PREFIX.length()).split('/')) {
      if (String.isNotBlank(part)) {
        result.add(EncodingUtil.urlDecode(part, 'UTF-8'));
      }
    }
    return result;
  }

  private static Id toId(String value, Schema.SObjectType expected) {
    Id parsed;
    try {
      parsed = Id.valueOf(value);
    } catch (Exception e) {
      throw new ShopException(ShopException.NOT_FOUND, 'Record not found.');
    }
    if (parsed.getSObjectType() != expected) {
      throw new ShopException(ShopException.NOT_FOUND, 'Record not found.');
    }
    return parsed;
  }

  private static Object parse(Blob body, System.Type target, Boolean emptyAllowed) {
    String text = body == null ? '' : body.toString().trim();
    if (String.isBlank(text)) {
      if (emptyAllowed) {
        return target.newInstance();
      }
      throw new ShopException(ShopException.VALIDATION, 'A request body is required.');
    }
    Object parsed = JSON.deserializeStrict(text, target);
    if (parsed == null) {
      throw new ShopException(ShopException.VALIDATION, 'A request body is required.');
    }
    return parsed;
  }

  private static void write(RestResponse res, Integer status, Object body) {
    res.statusCode = status;
    res.responseBody = Blob.valueOf(JSON.serialize(body));
  }
}
