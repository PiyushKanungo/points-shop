/** Stores a visitor's resume as a private Salesforce file on their order. */
public without sharing class ResumeService {
  public static final Integer MAX_BYTES = 2000000;

  public static ShopDtos.OrderDto save(Id walletId, Id orderId, String base64) {
    Savepoint sp = Database.setSavepoint();
    try {
      Blob pdf;
      try {
        pdf = EncodingUtil.base64Decode(base64);
      } catch (Exception e) {
        pdf = null;
      }
      if (pdf == null || pdf.size() < 5 || pdf.size() > MAX_BYTES) {
        throw new ShopException(ShopException.VALIDATION, 'The resume must be a PDF up to 2 MB.');
      }
      if (!EncodingUtil.convertToHex(pdf).startsWith('255044462d')) {
        throw new ShopException(ShopException.VALIDATION, 'The resume must be a PDF.');
      }
      ShopDtos.OrderDto shopOrder = OrderService.getOrder(walletId, orderId);
      if (
        shopOrder.status != OrderService.AWAITING_DETAILS ||
        shopOrder.offering.fulfilmentType != 'Resume'
      ) {
        throw new ShopException(ShopException.INVALID_STATE, 'This order is not waiting for a resume.');
      }
      ContentVersion version = new ContentVersion(
        Title = 'Resume ' + shopOrder.orderNumber,
        PathOnClient = 'resume.pdf',
        VersionData = pdf,
        FirstPublishLocationId = orderId
      );
      insert version;
      String documentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :version.Id]
        .ContentDocumentId;
      return OrderService.saveDetails(
        walletId,
        orderId,
        null,
        URL.getOrgDomainUrl().toExternalForm() +
          '/lightning/r/ContentDocument/' +
          documentId +
          '/view'
      );
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }
}
