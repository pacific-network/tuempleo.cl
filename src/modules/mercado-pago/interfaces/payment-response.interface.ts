import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';

export interface PaymentResponseExtended extends PaymentResponse {
  preference_id?: string;
  external_reference?: string;
  payer?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  additional_info?: any;
}
