// Dashboard App - Modal Forms & Submission Management
(function() {
  'use strict';

  // Elements
  const modal = document.getElementById('submission-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const submitBtn = document.getElementById('submit-btn');
  const toast = document.getElementById('toast');

  let currentService = null;
  let currentSubmission = null;

  // Form Templates
  const FORM_FIELDS = {
    target: [
      // User Information Section
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Account Information Section (NO IMAP for Target)
      { type: 'section_header', label: 'Account Information' },
      { name: 'account_email', label: 'Account Email *', type: 'email', required: true, wide: false },
      { name: 'account_password', label: 'Account Password *', type: 'password', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    walmart: [
      // User Information Section
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Account Information Section (includes IMAP for Walmart)
      { type: 'section_header', label: 'Account Information' },
      { name: 'account_email', label: 'Account Email *', type: 'email', required: true, wide: false },
      { name: 'account_password', label: 'Account Password *', type: 'password', required: true, wide: false },
      { name: 'account_imap', label: 'IMAP *', type: 'textarea', required: true, wide: true },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    bestbuy: [
      // User Information Section
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Account Information Section
      { type: 'section_header', label: 'Account Information' },
      { name: 'account_email', label: 'Account Email *', type: 'email', required: true, wide: false },
      { name: 'account_password', label: 'Account Password *', type: 'password', required: true, wide: false },
      { name: 'account_imap', label: 'IMAP *', type: 'textarea', required: true, wide: true },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    pokemoncenter: [
      // User Information Section
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Account Information Section
      { type: 'section_header', label: 'Account Information' },
      { name: 'account_email', label: 'Account Email *', type: 'email', required: true, wide: false },
      { name: 'account_password', label: 'Account Password *', type: 'password', required: true, wide: false },
      { name: 'account_imap', label: 'IMAP *', type: 'textarea', required: true, wide: true },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    shopify: [
      // User Information Section
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    login_required: [
      // Fallback template for services with login requirements that don't have custom forms
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Account Information Section
      { type: 'section_header', label: 'Account Information' },
      { name: 'account_email', label: 'Account Email *', type: 'email', required: true, wide: false },
      { name: 'account_password', label: 'Account Password *', type: 'password', required: true, wide: false },
      { name: 'account_imap', label: 'IMAP *', type: 'textarea', required: true, wide: true },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    no_login: [
      // Fallback template for services without login requirements
      { type: 'section_header', label: 'User Information' },
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'separator', type: 'separator' },

      // Billing Information Section
      { type: 'section_header', label: 'Billing Information' },
      { name: 'name_on_card', label: 'Cardholder Name *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },

      // Address Section
      { type: 'section_header', label: 'Address' },
      { name: 'address1', label: 'Street Name *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit/Apt #', type: 'text', required: false, wide: false },
      { name: 'city', label: 'City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Street Name', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ]
  };

  // Generate Form HTML
  function generateForm(serviceType, existingData = {}) {
    const fields = FORM_FIELDS[serviceType];

    if (!fields) {
      return '<div class="empty-state"><p>⚠️ Invalid service type</p></div>';
    }

    console.log('Generating form with existing data:', existingData);
    let html = '<form id="submission-form" novalidate><div class="form-grid">';

    fields.forEach(field => {
      if (field.type === 'separator') {
        html += '</div><hr style="border: none; border-top:1px solid var(--border); margin: var(--space-1) 0;"><div class="form-grid">';
        return;
      }

      // Handle section headers
      if (field.type === 'section_header') {
        html += `<div class="form-section-header" style="grid-column: 1 / -1; margin-top: var(--space-2); margin-bottom: 2px;">
          <h3 style="font-size: 0.7rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em;">${field.label}</h3>
        </div>`;
        return;
      }

      // Handle product selector
      // Handle conditional fields
      const conditionalAttr = field.conditional ? `data-conditional="${field.conditional}" data-conditional-value="${field.conditionalValue}"` : '';
      const conditionalClass = field.conditional ? 'conditional-field' : '';
      const initialDisplay = field.conditional ? (existingData[field.conditional] === field.conditionalValue ? '' : 'style="display:none;"') : '';

      const wideClass = field.wide ? 'wide' : '';
      html += `<label class="field ${wideClass} ${conditionalClass}" ${conditionalAttr} ${initialDisplay}>`;
      html += `<span class="label">${field.label}</span>`;

      if (field.type === 'checkbox') {
        const checked = existingData[field.name] !== undefined ? (existingData[field.name] ? 'checked' : '') : (field.default ? 'checked' : '');
        html += `<input class="control" type="checkbox" name="${field.name}" id="${field.name}" ${checked} style="width: 20px; height: 20px;">`;
      } else if (field.type === 'select') {
        html += `<select class="control" name="${field.name}" ${field.required ? 'required' : ''}>`;
        html += `<option value="" disabled ${!existingData[field.name] ? 'selected' : ''}>Select ${field.label.replace(' *', '')}</option>`;
        field.options.forEach(opt => {
          const value = opt.split('  ')[0];
          const existingValue = String(existingData[field.name] || '');
          const selected = existingValue === value ? 'selected' : '';
          html += `<option value="${value}" ${selected}>${opt}</option>`;
        });
        html += '</select>';
      } else if (field.type === 'textarea') {
        const placeholder = field.placeholder || `Enter ${field.label.replace(' *', '')}`;
        html += `<textarea class="control" name="${field.name}" placeholder="${placeholder}" rows="4" ${field.required ? 'required' : ''}>${existingData[field.name] || ''}</textarea>`;
      } else if (field.type === 'number') {
        const value = existingData[field.name] || field.default || '';
        html += `<input class="control" type="number" name="${field.name}" placeholder="${field.label.replace(' *', '')}" ${field.required ? 'required' : ''} ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} value="${value}">`;
      } else if (field.type === 'password') {
        // SECURITY: Never pre-fill password fields, use placeholder instead
        const placeholderText = existingData[field.name] ? 'Current password (unchanged)' : field.label.replace(' *', '');
        html += `<div style="position: relative;">`;
        html += `<input class="control" type="password" name="${field.name}" placeholder="${placeholderText}" autocomplete="new-password" data-lpignore="true" data-form-type="other" ${field.maxlength ? `maxlength="${field.maxlength}"` : ''}>`;
        html += `<button type="button" class="password-toggle" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px 8px; color: var(--muted); font-size: 1.2rem;" onclick="togglePasswordVisibility(this)">👁️</button>`;
        html += `</div>`;
      } else {
        const value = existingData[field.name] || '';
        html += `<input class="control" type="${field.type}" name="${field.name}" placeholder="${field.label.replace(' *', '')}" ${field.required ? 'required' : ''} ${field.maxlength ? `maxlength="${field.maxlength}"` : ''} value="${value}">`;
      }

      html += `<div class="invalid-feedback">This field is required.</div>`;
      html += '</label>';
    });

    html += '</div></form>';
    return html;
  }

  // Show Modal
  async function showModal(service, submissionData = null) {
    currentService = service;
    currentSubmission = submissionData;

    const card = document.querySelector(`[data-id="${service}"]`);
    const serviceType = card.dataset.type;
    const serviceTitle = card.dataset.title;

    // Map service name to form type (target, walmart, or fallback to service type)
    let formType = serviceType;
    if (service === 'target') formType = 'target';
    else if (service === 'walmart') formType = 'walmart';

    modalTitle.textContent = submissionData ? `Edit ${serviceTitle}` : `Add ${serviceTitle} Submission`;
    modalBody.innerHTML = generateForm(formType, submissionData || {});

    // Set up conditional field toggle for billing_same_as_shipping checkbox
    setTimeout(() => {
      const billingCheckbox = document.getElementById('billing_same_as_shipping');
      if (billingCheckbox) {
        const toggleConditionalFields = () => {
          const conditionalFields = document.querySelectorAll('[data-conditional="billing_same_as_shipping"]');
          conditionalFields.forEach(field => {
            const showWhen = field.dataset.conditionalValue === 'false';
            if (billingCheckbox.checked === !showWhen) {
              field.style.display = '';
            } else {
              field.style.display = 'none';
            }
          });
        };

        billingCheckbox.addEventListener('change', toggleConditionalFields);
        toggleConditionalFields(); // Initial state
      }
    }, 0);

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  // Close Modal
  function closeModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    currentService = null;
    currentSubmission = null;
  }

  // Show Toast
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Validate Form
  function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('[required]');

    inputs.forEach(input => {
      const field = input.closest('.field');
      if (!input.value.trim()) {
        field.classList.add('invalid');
        isValid = false;
      } else {
        field.classList.remove('invalid');
      }
    });

    return isValid;
  }

  // Submit Form
  async function submitForm() {
    const form = document.getElementById('submission-form');
    if (!validateForm(form)) {
      showToast('Please fill out all required fields');
      return;
    }

    // Get form data
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      // Skip product selector fields (we'll handle them separately)
      if (!key.startsWith('product_')) {
        data[key] = value;
      }
    });

    // Handle checkbox fields (they don't appear in FormData if unchecked)
    const billingCheckbox = document.getElementById('billing_same_as_shipping');
    if (billingCheckbox) {
      data.billing_same_as_shipping = billingCheckbox.checked;
    }

    // Add service
    data.service = currentService;

    console.log('Submitting data:', data);

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const url = currentSubmission ? `/api/submissions/${currentSubmission.id}` : '/api/submissions';
      const method = currentSubmission ? 'PUT' : 'POST';

      console.log('Making request to:', url, 'with method:', method);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        showToast(errorData.error || 'Submission failed');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        return;
      }

      const result = await response.json();
      console.log('Success result:', result);
      showToast(result.message || 'Submission successful!');

      // Reset button state before closing
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';

      closeModal();

      // Reload submissions list
      loadSubmissions();

      // Update service cards to reflect new submission status
      updateServiceCards();

    } catch (error) {
      console.error('Submission error:', error);
      showToast('Failed to submit. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  }

  // Event Listeners
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Add submission button
    if (target.matches('[data-action="add-submission"]')) {
      e.stopPropagation();
      const service = target.dataset.service;
      showModal(service);
    }

    // Click on service card to view/edit submissions
    if (target.closest('.card') && !target.matches('[data-action="add-submission"]')) {
      const card = target.closest('.card');
      const serviceId = card.dataset.id;
      const submissions = JSON.parse(card.dataset.submissions || '[]');

      if (submissions.length > 0) {
        // Show submissions in a modal or scroll to submissions section
        scrollToSubmissions(serviceId);
      } else {
        // If no submissions, open the add submission modal
        showModal(serviceId);
      }
    }

    // Close modal
    if (target.matches('[data-action="close-modal"]') || target.matches('[data-action="cancel"]')) {
      closeModal();
    }

    // Submit form
    if (target.matches('[data-action="submit-form"]')) {
      submitForm();
    }

    // Close modal on backdrop click
    if (target === modal) {
      closeModal();
    }
  });

  // Scroll to submissions section and show only this service's submissions
  function scrollToSubmissions(serviceId) {
    displaySubmissionsForService(serviceId);
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });

  // Update service cards based on current submissions
  async function updateServiceCards() {
    try {
      const response = await fetch('/api/submissions', {
        credentials: 'same-origin'
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const submissions = data.submissions || [];

      // Create a map of service names to arrays of submissions (supports multiple per service)
      const serviceMap = {};
      submissions.forEach(sub => {
        if (!serviceMap[sub.service_name]) {
          serviceMap[sub.service_name] = [];
        }
        serviceMap[sub.service_name].push(sub);
      });

      // Update each service card
      const cards = document.querySelectorAll('.card[data-id]');
      cards.forEach(card => {
        const serviceId = card.dataset.id;
        const serviceSubmissions = serviceMap[serviceId] || [];
        const count = serviceSubmissions.length;

        // Update badge
        const badgeContainer = card.querySelector('.card-status');
        if (badgeContainer) {
          if (count > 0) {
            badgeContainer.innerHTML = '<div class="badge badge-success">✅ Active</div>';
          } else {
            badgeContainer.innerHTML = '<div class="badge badge-info">🔓 Available</div>';
          }
        }

        // Update submission count
        const noteContainer = card.querySelector('.inline-note');
        if (noteContainer) {
          noteContainer.innerHTML = `📄 <strong>${count}</strong> submission${count === 1 ? '' : 's'}`;
        }

        // Update button text (always show "Add" since multiple submissions are allowed)
        const button = card.querySelector('[data-action="add-submission"]');
        if (button) {
          button.textContent = '+ Add Submission';
        }
      });

      // Update toolbar active count (count of services with at least one submission)
      const activeCount = Object.keys(serviceMap).length;
      const activeChip = document.querySelector('.toolbar .chip');
      if (activeChip) {
        activeChip.textContent = `📊 ${activeCount} Active`;
      }

    } catch (error) {
      console.error('Update service cards error:', error);
    }
  }

  // Load and display submissions
  async function loadSubmissions() {
    try {
      console.log('Loading submissions...');
      const response = await fetch('/api/submissions', {
        credentials: 'same-origin'
      });

      console.log('Submissions response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to load submissions');
      }

      const data = await response.json();
      console.log('Submissions data received:', data);
      console.log('Number of submissions:', data.submissions ? data.submissions.length : 0);
      if (data.submissions && data.submissions.length > 0) {
        console.log('First submission:', data.submissions[0]);
      }
      displaySubmissions(data.submissions);

    } catch (error) {
      console.error('Load submissions error:', error);
      document.getElementById('submissions-list').innerHTML = `
        <div class="empty-state">
          <p>Failed to load submissions</p>
        </div>
      `;
    }
  }

  // Store all submissions globally
  let allSubmissions = [];

  // Display submissions for a specific service only
  function displaySubmissionsForService(serviceId) {
    const container = document.getElementById('submissions-list');

    if (!allSubmissions || allSubmissions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📋 No submissions yet</p>
          <p style="font-size: 0.9rem;">Click on a service card above to add your first submission</p>
        </div>
      `;
      return;
    }

    // Format service name helper
    const formatServiceName = (name) => {
      const specialCases = {
        'pokemoncenter': 'Pokemon Center',
        'walmart': 'Walmart',
        'target': 'Target',
        'bestbuy': 'Best Buy',
        'gamestop': 'GameStop',
        'amazon': 'Amazon',
        'costco': 'Costco',
        'shopify': 'Shopify'
      };
      return specialCases[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
    };

    // Filter submissions for this service only
    const serviceSubs = allSubmissions.filter(sub => sub.service_name.toLowerCase() === serviceId.toLowerCase());

    if (serviceSubs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📋 No ${formatServiceName(serviceId)} submissions yet</p>
          <p style="font-size: 0.9rem;">Click "Add Submission" to create one</p>
        </div>
      `;
      return;
    }

    const serviceName = formatServiceName(serviceId);

    let html = `
      <div class="service-submission-section" id="submissions-${serviceId}" style="margin-bottom: var(--space-8);">
        <h3 style="margin-bottom: var(--space-4); color: var(--text-900); font-size: 1.2rem;">
          ${serviceName} Submissions (${serviceSubs.length})
        </h3>
        <div class="submissions-table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Email</th>
                <th>Last 4 Digits</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
    `;

    serviceSubs.forEach(sub => {
      const serviceType = sub.service_type === 'login_required' ? 'Login Required' : 'No Login';
      const email = sub.email || sub.account_email || '-';
      const last4 = sub.card_number ? sub.card_number.slice(-4) : '-';
      const notes = sub.notes ? (sub.notes.length > 50 ? sub.notes.substring(0, 50) + '...' : sub.notes) : '-';
      const notesTitle = sub.notes || '';
      const status = sub.status === 'active' ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>';
      const created = new Date(sub.created_at).toLocaleDateString();

      // Handle decryption errors
      const hasError = sub.error === true || email === '[Decryption Error]';
      const errorClass = hasError ? 'style="background: rgba(239, 68, 68, 0.1);"' : '';
      const errorWarning = hasError ? '<span style="color: #ef4444; font-size: 0.85rem;"> ⚠ Error</span>' : '';

      html += `
        <tr ${errorClass} data-service="${serviceId}">
          <td>${serviceType}${errorWarning}</td>
          <td>${hasError ? '<span style="color: #ef4444;">[Decryption Error]</span>' : email}</td>
          <td>****${last4}</td>
          <td title="${notesTitle}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${notes}</td>
          <td>${status}</td>
          <td>${created}</td>
          <td>
            <div class="submission-actions">
              <button class="btn btn-primary btn-sm" data-action="edit-submission" data-id="${sub.id}" ${hasError ? 'disabled title="Cannot edit - decryption error"' : ''}>
                ✏️ Edit
              </button>
              <button class="btn btn-danger btn-sm" data-action="delete-submission" data-id="${sub.id}">
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Scroll to the section
    const serviceSection = document.getElementById(`submissions-${serviceId}`);
    if (serviceSection) {
      serviceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Highlight the service section briefly
      setTimeout(() => {
        serviceSection.style.background = 'rgba(59, 130, 246, 0.1)';
        serviceSection.style.borderRadius = 'var(--radius-lg)';
        serviceSection.style.padding = 'var(--space-4)';
        setTimeout(() => {
          serviceSection.style.background = '';
          serviceSection.style.padding = '';
        }, 2000);
      }, 500);
    }
  }

  // Initial load - just store submissions, don't display
  function displaySubmissions(submissions) {
    allSubmissions = submissions || [];
    const container = document.getElementById('submissions-list');
    container.innerHTML = `
      <div class="empty-state">
        <p>📋 Click on a service panel above to view submissions</p>
      </div>
    `;
  }

  // Edit submission
  async function editSubmission(submissionId) {
    try {
      // Fetch submission data
      const response = await fetch('/api/submissions', {
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error('Failed to load submission');
      }

      const { submissions } = await response.json();
      const submission = submissions.find(s => s.id === parseInt(submissionId));

      console.log('Found submission for editing:', submission);

      if (!submission) {
        showToast('Submission not found');
        return;
      }

      // Check if submission has decryption error
      if (submission.error === true || submission.email === '[Decryption Error]' || submission.account_email === '[Decryption Error]') {
        showToast('Cannot edit submission with decryption error. Please delete and recreate it.');
        return;
      }

      // Validate service type
      if (!submission.service_type || !FORM_FIELDS[submission.service_type]) {
        showToast('Cannot edit submission: Invalid service type');
        return;
      }

      // Set current submission for editing
      currentSubmission = submission;
      currentService = submission.service_name;

      // Determine service type
      const serviceType = submission.service_type;

      console.log('Generating form with service type:', serviceType);
      console.log('Submission data for form:', submission);

      // Show modal with existing data
      modalTitle.textContent = `Edit ${submission.service_name.charAt(0).toUpperCase() + submission.service_name.slice(1)} Submission`;
      modalBody.innerHTML = generateForm(serviceType, submission);

      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');

    } catch (error) {
      console.error('Edit submission error:', error);
      showToast('Failed to load submission for editing');
    }
  }

  // Delete submission
  async function deleteSubmission(submissionId) {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error('Failed to delete submission');
      }

      const result = await response.json();
      showToast(result.message || 'Submission deleted successfully!');

      // Reload submissions
      loadSubmissions();

      // Update service cards
      updateServiceCards();

    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete submission');
    }
  }


  // Handle edit/delete button clicks
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Edit submission
    if (target.matches('[data-action="edit-submission"]')) {
      const submissionId = target.dataset.id;
      editSubmission(submissionId);
    }

    // Delete submission
    if (target.matches('[data-action="delete-submission"]')) {
      const submissionId = target.dataset.id;
      deleteSubmission(submissionId);
    }
  });

  // Load submissions on page load
  loadSubmissions();

  console.log('✅ Dashboard app initialized');
})();

// Global function for password visibility toggle
function togglePasswordVisibility(button) {
  const input = button.previousElementSibling;
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁️';
  }
}
