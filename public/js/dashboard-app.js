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

  // Store panel products globally for product selector
  let currentPanelProducts = [];

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

      // Checkouts Section (dynamic product selector)
      { type: 'section_header', label: 'Checkouts' },
      { type: 'product_selector', name: 'selected_products' },
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

      // Checkouts Section (dynamic product selector)
      { type: 'section_header', label: 'Checkouts' },
      { type: 'product_selector', name: 'selected_products' },
      { name: 'separator', type: 'separator' },

      // Notes Section
      { type: 'section_header', label: 'Notes' },
      { name: 'notes', label: 'Additional Notes (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    login_required: [
      // Keep old login_required for backwards compatibility with bestbuy
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'name_on_card', label: 'Name on Card *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },
      { name: 'address1', label: 'Shipping Address *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit Number', type: 'text', required: false, wide: false },
      { name: 'city', label: 'Shipping City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'Shipping State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Shipping Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'country', label: 'Country *', type: 'select', required: true, wide: false, options: ['United States'], default: 'United States' },
      { name: 'separator', type: 'separator' },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping?', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Address', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },
      { name: 'account_email', label: 'Account Email *', type: 'email', required: true, wide: false },
      { name: 'account_password', label: 'Account Password *', type: 'text', required: true, wide: false },
      { name: 'account_imap', label: 'Account iMap *', type: 'textarea', required: true, wide: true },
      { name: 'separator', type: 'separator' },
      { name: 'max_qty', label: 'Max Quantity per Checkout *', type: 'number', required: true, wide: false, min: 1, max: 99, default: 1 },
      { name: 'max_checkouts', label: 'Max Checkouts per Drop *', type: 'number', required: true, wide: false, min: 1, max: 99, default: 1 },
      { name: 'separator', type: 'separator' },
      { name: 'notes', label: 'Special Instructions (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
    ],
    no_login: [
      { name: 'first_name', label: 'First Name *', type: 'text', required: true, wide: false },
      { name: 'last_name', label: 'Last Name *', type: 'text', required: true, wide: false },
      { name: 'email', label: 'Email Address *', type: 'email', required: true, wide: false },
      { name: 'phone', label: 'Phone Number *', type: 'tel', required: true, wide: false },
      { name: 'name_on_card', label: 'Name on Card *', type: 'text', required: true, wide: false },
      { name: 'card_type', label: 'Card Type *', type: 'select', required: true, wide: false, options: ['Visa', 'Mastercard', 'American Express', 'Discover'] },
      { name: 'card_number', label: 'Card Number *', type: 'text', required: true, wide: false, maxlength: 16 },
      { name: 'cvv', label: 'CVV *', type: 'text', required: true, wide: false, maxlength: 4 },
      { name: 'exp_month', label: 'Expiration Month *', type: 'select', required: true, wide: false, options: ['1  January', '2  February', '3  March', '4  April', '5  May', '6  June', '7  July', '8  August', '9  September', '10  October', '11  November', '12  December'] },
      { name: 'exp_year', label: 'Expiration Year *', type: 'select', required: true, wide: false, options: ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'] },
      { name: 'separator', type: 'separator' },
      { name: 'address1', label: 'Shipping Address *', type: 'text', required: true, wide: false },
      { name: 'unit_number', label: 'Unit Number', type: 'text', required: false, wide: false },
      { name: 'city', label: 'Shipping City *', type: 'text', required: true, wide: false },
      { name: 'state', label: 'Shipping State *', type: 'select', required: true, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
      { name: 'zip_code', label: 'Shipping Zipcode *', type: 'text', required: true, wide: false, maxlength: 10 },
      { name: 'country', label: 'Country *', type: 'select', required: true, wide: false, options: ['United States'], default: 'United States' },
      { name: 'separator', type: 'separator' },
      { name: 'billing_same_as_shipping', label: 'Billing Address Same as Shipping?', type: 'checkbox', required: false, wide: true, default: true },
      { name: 'billing_address', label: 'Billing Address', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_city', label: 'Billing City', type: 'text', required: false, wide: false, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_state', label: 'Billing State', type: 'select', required: false, wide: false, options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'billing_zipcode', label: 'Billing Zipcode', type: 'text', required: false, wide: false, maxlength: 10, conditional: 'billing_same_as_shipping', conditionalValue: false },
      { name: 'separator', type: 'separator' },
      { name: 'max_qty', label: 'Max Quantity per Checkout *', type: 'number', required: true, wide: false, min: 1, max: 99, default: 1 },
      { name: 'max_checkouts', label: 'Max Checkouts per Drop *', type: 'number', required: true, wide: false, min: 1, max: 99, default: 1 },
      { name: 'separator', type: 'separator' },
      { name: 'notes', label: 'Special Instructions (Optional)', type: 'textarea', required: false, wide: true, placeholder: 'Example: Only run ETB, avoid booster boxes, etc.' }
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
        html += '</div><hr style="border: none; border-top:1px solid var(--border); margin: var(--space-6) 0;"><div class="form-grid">';
        return;
      }

      // Handle section headers
      if (field.type === 'section_header') {
        html += `<div class="form-section-header" style="grid-column: 1 / -1; margin-top: var(--space-6); margin-bottom: var(--space-3);">
          <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text);">${field.label}</h3>
        </div>`;
        return;
      }

      // Handle product selector
      if (field.type === 'product_selector') {
        html += '<div class="product-selector" style="grid-column: 1 / -1;">';

        if (currentPanelProducts && currentPanelProducts.length > 0) {
          currentPanelProducts.forEach((product, idx) => {
            const existingProduct = existingData.selected_products?.find(p => p.product === product.name) || {};
            const isChecked = existingProduct.product ? 'checked' : '';
            const quantity = existingProduct.quantity || 1;
            const checkouts = existingProduct.checkouts || 1;

            html += `
              <div class="product-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
                <input type="checkbox" name="product_${idx}_selected" id="product_${idx}" ${isChecked}
                  style="width: 20px; height: 20px;">
                <label for="product_${idx}" style="flex: 1; font-weight: 500;">${product.name}</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="font-size: 0.9rem; color: var(--muted);">Quantity:</label>
                  <select name="product_${idx}_quantity" style="width: 80px; padding: 4px 8px;" class="control">
                    <option value="1" ${quantity === 1 ? 'selected' : ''}>1</option>
                    <option value="2" ${quantity === 2 ? 'selected' : ''}>2</option>
                    <option value="${product.max_qty}" ${quantity === product.max_qty || quantity === 'max' ? 'selected' : ''}>Max (${product.max_qty})</option>
                  </select>
                  <label style="font-size: 0.9rem; color: var(--muted);">Checkouts:</label>
                  <select name="product_${idx}_checkouts" style="width: 80px; padding: 4px 8px;" class="control">
                    <option value="1" ${checkouts === 1 ? 'selected' : ''}>1</option>
                    <option value="2" ${checkouts === 2 ? 'selected' : ''}>2</option>
                    <option value="${product.max_checkouts}" ${checkouts === product.max_checkouts || checkouts === 'many' ? 'selected' : ''}>Many (${product.max_checkouts})</option>
                  </select>
                </div>
              </div>
            `;
          });
        } else {
          html += '<p style="color: var(--muted); font-style: italic;">No products configured for this panel. Contact admin.</p>';
        }

        html += '</div>';
        return;
      }

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

    // Fetch panel products for target/walmart
    if (service === 'target' || service === 'walmart') {
      try {
        const response = await fetch(`/api/panels/${service}/products`);
        if (response.ok) {
          const data = await response.json();
          currentPanelProducts = data.products || [];
        }
      } catch (error) {
        console.error('Error fetching panel products:', error);
        currentPanelProducts = [];
      }
    } else {
      currentPanelProducts = [];
    }

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

    // Collect selected products
    const selectedProducts = [];
    if (currentPanelProducts && currentPanelProducts.length > 0) {
      currentPanelProducts.forEach((product, idx) => {
        const checkbox = document.querySelector(`input[name="product_${idx}_selected"]`);
        if (checkbox && checkbox.checked) {
          const quantity = parseInt(document.querySelector(`select[name="product_${idx}_quantity"]`).value) || 1;
          const checkouts = parseInt(document.querySelector(`select[name="product_${idx}_checkouts"]`).value) || 1;
          selectedProducts.push({
            product: product.name,
            quantity: quantity,
            checkouts: checkouts
          });
        }
      });
    }
    data.selected_products = selectedProducts;

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

  // Scroll to submissions section and highlight service's submission
  function scrollToSubmissions(serviceId) {
    const submissionsSection = document.getElementById('submissions-list');
    if (submissionsSection) {
      submissionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Highlight the submission row for this service
      setTimeout(() => {
        const rows = submissionsSection.querySelectorAll('tr');
        rows.forEach(row => {
          const serviceCell = row.querySelector('td:first-child strong');
          if (serviceCell && serviceCell.textContent.toLowerCase() === serviceId.toLowerCase()) {
            row.style.background = 'rgba(6, 182, 212, 0.15)';
            setTimeout(() => {
              row.style.transition = 'background 1s ease';
              row.style.background = '';
            }, 1500);
          }
        });
      }, 500);
    }
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

  // Display submissions in a table
  function displaySubmissions(submissions) {
    const container = document.getElementById('submissions-list');

    if (!submissions || submissions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📋 No submissions yet</p>
          <p style="font-size: 0.9rem;">Click on a service card above to add your first submission</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="submissions-table">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Type</th>
              <th>Email</th>
              <th>Last 4 Digits</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Added to Bot</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    submissions.forEach(sub => {
      // Format service name properly (e.g., "pokemoncenter" -> "Pokemon Center")
      const formatServiceName = (name) => {
        const specialCases = {
          'pokemoncenter': 'Pokemon Center',
          'walmart': 'Walmart',
          'target': 'Target',
          'bestbuy': 'Best Buy',
          'gamestop': 'GameStop',
          'amazon': 'Amazon'
        };
        return specialCases[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
      };

      const serviceName = formatServiceName(sub.service_name);
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

      const addedToBotChecked = sub.added_to_bot ? 'checked' : '';

      html += `
        <tr ${errorClass}>
          <td><strong>${serviceName}</strong>${errorWarning}</td>
          <td>${serviceType}</td>
          <td>${hasError ? '<span style="color: #ef4444;">[Decryption Error]</span>' : email}</td>
          <td>****${last4}</td>
          <td title="${notesTitle}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${notes}</td>
          <td>${status}</td>
          <td style="text-align: center;">
            <input type="checkbox"
                   class="bot-checkbox"
                   data-submission-id="${sub.id}"
                   ${addedToBotChecked}
                   style="width: 20px; height: 20px; cursor: pointer;">
          </td>
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
    `;

    container.innerHTML = html;
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

  // Handle added_to_bot checkbox toggle
  document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('bot-checkbox')) {
      const checkbox = e.target;
      const submissionId = checkbox.dataset.submissionId;
      const addedToBot = checkbox.checked ? 1 : 0;

      try {
        const response = await fetch(`/api/submissions/${submissionId}/toggle-bot`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ added_to_bot: addedToBot })
        });

        if (!response.ok) {
          throw new Error('Failed to update checkbox');
        }

        showToast(checkbox.checked ? '✅ Marked as added to bot' : '⬜ Unmarked from bot');
      } catch (error) {
        console.error('Toggle bot checkbox error:', error);
        // Revert checkbox on error
        checkbox.checked = !checkbox.checked;
        showToast('Failed to update. Please try again.');
      }
    }
  });

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
