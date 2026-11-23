import { CustomTicketField, Delegate, EventItem } from '../types';

export interface RegFormData {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  jobTitle: string;
  company: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  registrationCategory: string;
  basicComboTicket: 'Yes' | 'No';
  linkedInUrl: string;
  shareDetailsWithPartners: 'Yes' | 'No';
  hasDietary: 'Yes' | 'No';
  dietaryDetails: string;
  stadiumTour: 'Yes' | 'No';
  awardsNightDinner: 'Yes' | 'No';
  day1Workshop: 'Yes' | 'No';
  day2: 'Yes' | 'No';
  day3: 'Yes' | 'No';
  experienceLevel: string;
  industry: string;
  promoCode: string;
  newsletterOptIn: 'Yes' | 'No';
  customTickets: Record<string, 'Yes' | 'No'>;
}

export function extractCityFromEvent(event: EventItem | undefined): string {
  if (!event?.city) return '';
  return event.city.split(',')[0].trim();
}

export function buildRegFormData(
  delegate: Delegate,
  activeEvent: EventItem | undefined,
  customTicketFields: CustomTicketField[],
  overrides?: Partial<Pick<RegFormData, 'password' | 'city' | 'linkedInUrl' | 'jobTitle'>>
): RegFormData {
  const password = overrides?.password ?? 'Pce2026!@#';
  const city =
    overrides?.city !== undefined
      ? overrides.city
      : extractCityFromEvent(activeEvent);
  const linkedInUrl = overrides?.linkedInUrl ?? '';
  const jobTitle =
    overrides?.jobTitle !== undefined
      ? overrides.jobTitle
      : delegate.jobTitle.trim() || 'Delegate';

  const customTickets: Record<string, 'Yes' | 'No'> = {};
  for (const tf of customTicketFields) {
    customTickets[tf.label] = delegate.customTickets?.[tf.id] ? 'Yes' : 'No';
  }

  return {
    firstName: delegate.firstName.trim(),
    lastName: delegate.lastName.trim(),
    password,
    confirmPassword: password,
    jobTitle,
    company: delegate.company.trim(),
    city,
    country: delegate.country.trim() || 'Australia',
    email: delegate.email.trim(),
    phone: delegate.phone.trim(),
    registrationCategory: delegate.registrationCategory.trim() || 'Partner',
    basicComboTicket: delegate.day2 || delegate.day3 ? 'Yes' : 'No',
    linkedInUrl,
    shareDetailsWithPartners: delegate.shareDetailsWithPartners ? 'Yes' : 'No',
    hasDietary: delegate.hasDietary ? 'Yes' : 'No',
    dietaryDetails: delegate.hasDietary ? delegate.dietaryDetails.trim() : '',
    stadiumTour: delegate.stadiumTour ? 'Yes' : 'No',
    awardsNightDinner: delegate.awardsNightDinner ? 'Yes' : 'No',
    day1Workshop: delegate.day1Workshop ? 'Yes' : 'No',
    day2: delegate.day2 ? 'Yes' : 'No',
    day3: delegate.day3 ? 'Yes' : 'No',
    experienceLevel: delegate.experienceLevel || '',
    industry: delegate.industry || '',
    promoCode: delegate.promoCode.trim(),
    newsletterOptIn: delegate.newsletterOptIn ? 'Yes' : 'No',
    customTickets,
  };
}

/**
 * Core DOM auto-fill engine (serialized as a clean IIFE for Console paste or Bookmarklet).
 * Matches inputs, selects, textareas, and radio groups by label text, name, id, placeholder,
 * or aria-label, dispatches React/Vue/jQuery-compatible events, and retries conditional fields
 * (like Dietary Details) 300ms after selecting Yes.
 */
function buildAutoFillCoreBody(): string {
  return `
  function fillRegForm(data) {
    if (!data || typeof data !== 'object') return { filled: 0, fields: [] };
    var norm = function(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/[\\*\\?:]/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();
    };

    var setNativeValue = function(el, val) {
      var proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : el.tagName === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        desc.set.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      if (window.jQuery) {
        try { window.jQuery(el).trigger('change'); } catch (e) {}
      }
    };

    var getControlLabel = function(el) {
      var parts = [];
      if (el.id) {
        var forLbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (forLbl) parts.push(forLbl.textContent || '');
      }
      var wrapLbl = el.closest('label');
      if (wrapLbl) parts.push(wrapLbl.textContent || '');
      var parent = el.parentElement;
      for (var depth = 0; depth < 3 && parent; depth++) {
        var lbl = parent.querySelector('label, .form-label, .field-label, legend');
        if (lbl && !lbl.contains(el)) {
          var siblings = parent.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), select, textarea');
          if (siblings.length <= 1) {
            parts.push(lbl.textContent || '');
            break;
          }
        }
        parent = parent.parentElement;
      }
      parts.push(el.getAttribute('aria-label') || '');
      parts.push(el.getAttribute('placeholder') || '');
      parts.push(el.getAttribute('name') || '');
      parts.push(el.getAttribute('id') || '');
      return norm(parts.join(' '));
    };

    var setSelect = function(selectEl, targetVal) {
      if (!selectEl || selectEl.disabled || !targetVal) return false;
      var want = norm(targetVal);
      var opts = Array.from(selectEl.options || []);
      var match =
        opts.find(function(o) { return norm(o.textContent) === want || norm(o.value) === want; }) ||
        opts.find(function(o) {
          var t = norm(o.textContent);
          return t && !t.startsWith('select') && !t.startsWith('do you') && (t.indexOf(want) !== -1 || want.indexOf(t) !== -1);
        });
      if (!match && (want === 'yes' || want === 'no')) {
        match = opts.find(function(o) {
          var v = norm(o.value);
          var t = norm(o.textContent);
          return want === 'yes' ? (v === '1' || v === 'true' || t.startsWith('yes')) : (v === '0' || v === 'false' || t.startsWith('no'));
        });
      }
      if (!match) return false;
      setNativeValue(selectEl, match.value);
      return true;
    };

    var setRadioByLabel = function(keywords, wantYesNo) {
      var want = norm(wantYesNo);
      var radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      if (!radios.length) return false;
      var groups = new Map();
      radios.forEach(function(r) {
        var key = r.name || (r.parentElement ? r.parentElement.className : 'default');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      });
      var matchedGroup = null;
      groups.forEach(function(list) {
        if (matchedGroup) return;
        var container = list[0].closest('.form-group, .field, .row > div, fieldset, div');
        var ctx = norm(
          (container ? container.textContent : '') + ' ' + (list[0].name || '') + ' ' + (list[0].id || '')
        );
        if (keywords.some(function(k) { return ctx.indexOf(k) !== -1; })) {
          matchedGroup = list;
        }
      });
      if (!matchedGroup) return false;
      var targetRadio = matchedGroup.find(function(r) {
        var rLbl = '';
        if (r.id) {
          var l = document.querySelector('label[for="' + CSS.escape(r.id) + '"]');
          if (l) rLbl += ' ' + l.textContent;
        }
        if (r.closest('label')) rLbl += ' ' + r.closest('label').textContent;
        if (r.nextSibling && r.nextSibling.textContent) rLbl += ' ' + r.nextSibling.textContent;
        rLbl = norm(rLbl + ' ' + (r.value || ''));
        if (want === 'yes') return rLbl === 'yes' || rLbl.startsWith('yes') || norm(r.value) === '1' || norm(r.value) === 'true';
        return rLbl === 'no' || rLbl.startsWith('no') || norm(r.value) === '0' || norm(r.value) === 'false';
      });
      if (!targetRadio) return false;
      targetRadio.checked = true;
      targetRadio.click();
      targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    var rules = [
      { key: 'firstName', label: 'First Name', match: ['first name', 'firstname', 'first_name', 'fname'], exclude: ['last'] },
      { key: 'lastName', label: 'Last Name', match: ['last name', 'lastname', 'last_name', 'lname', 'surname'], exclude: ['first'] },
      { key: 'confirmPassword', label: 'Confirm Password', match: ['confirm password', 'password confirmation', 'confirm_password', 'retype password', 'cpassword'], exclude: [] },
      { key: 'password', label: 'Create Password', match: ['create password', 'password', 'user_pass'], exclude: ['confirm', 'retype', 'cpassword'] },
      { key: 'jobTitle', label: 'Job Title', match: ['job title', 'jobtitle', 'job_title', 'designation', 'position'], exclude: [] },
      { key: 'company', label: 'Company', match: ['company', 'organisation', 'organization'], exclude: ['linkedin'] },
      { key: 'city', label: 'City', match: ['city', 'town'], exclude: ['country'] },
      { key: 'country', label: 'Country', match: ['country'], exclude: ['city'] },
      { key: 'email', label: 'Email', match: ['email', 'e-mail'], exclude: ['confirm'] },
      { key: 'phone', label: 'Phone', match: ['phone', 'mobile', 'telephone', 'contact number'], exclude: [] },
      { key: 'registrationCategory', label: 'Registration Category', match: ['registration category', 'category', 'pass type', 'attendee type'], exclude: [] },
      { key: 'basicComboTicket', label: 'Basic Combo Ticket', match: ['basic combo', 'combo ticket'], exclude: [] },
      { key: 'linkedInUrl', label: 'LinkedIn Profile Link', match: ['linkedin', 'linked in'], exclude: [] },
      { key: 'shareDetailsWithPartners', label: 'Share Details With Partners', radio: true, match: ['share my details', 'carefully chosen partners', 'share details', 'share_details'], exclude: [] },
      { key: 'hasDietary', label: 'Dietary Requirements', match: ['do you have any dietary', 'dietary requirements', 'has dietary', 'has_dietary'], exclude: ['detail', 'specify', 'note', 'allerg'] },
      { key: 'dietaryDetails', label: 'Dietary Details', match: ['dietary details', 'specify dietary', 'dietary notes', 'allergies', 'special dietary'], exclude: ['do you have'] },
      { key: 'stadiumTour', label: 'Stadium Tour', match: ['stadium tour', 'stadium_tour'], exclude: [] },
      { key: 'awardsNightDinner', label: 'Awards Night', match: ['awards night', 'awards dinner', 'gala dinner'], exclude: [] },
      { key: 'day1Workshop', label: 'Day 1 Workshop', match: ['day 1', 'day1', 'workshop'], exclude: ['day 2', 'day 3'] },
      { key: 'day2', label: 'Day 2', match: ['day 2', 'day2'], exclude: ['day 1', 'day 3'] },
      { key: 'day3', label: 'Day 3', match: ['day 3', 'day3'], exclude: ['day 1', 'day 2'] },
      { key: 'experienceLevel', label: 'Experience Level', match: ['experience level', 'seniority'], exclude: [] },
      { key: 'industry', label: 'Industry', match: ['industry', 'sector'], exclude: [] },
      { key: 'promoCode', label: 'Promo Code', match: ['promo code', 'coupon', 'discount code', 'voucher'], exclude: [] },
      { key: 'newsletterOptIn', label: 'Newsletter', radio: true, match: ['newsletter', 'marketing', 'subscribe'], exclude: [] }
    ];

    var filledLabels = [];
    var usedControls = new Set();

    var runPass = function() {
      var controls = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="radio"]):not([type="checkbox"]), select, textarea'));
      rules.forEach(function(rule) {
        var val = data[rule.key];
        if (val === undefined || val === null || val === '') return;
        if (filledLabels.indexOf(rule.label) !== -1) return;

        if (rule.radio) {
          if (setRadioByLabel(rule.match, val)) {
            filledLabels.push(rule.label);
            return;
          }
        }

        var found = controls.find(function(el) {
          if (usedControls.has(el) || el.disabled) return false;
          var lbl = getControlLabel(el);
          if (!lbl) return false;
          if (rule.exclude && rule.exclude.some(function(ex) { return lbl.indexOf(ex) !== -1; })) return false;
          return rule.match.some(function(kw) { return lbl.indexOf(kw) !== -1; });
        });

        if (!found) return;
        var ok = false;
        if (found.tagName === 'SELECT') {
          ok = setSelect(found, String(val));
        } else {
          setNativeValue(found, String(val));
          ok = true;
        }
        if (ok) {
          usedControls.add(found);
          filledLabels.push(rule.label);
        }
      });
    };

    runPass();
    setTimeout(function() {
      runPass();
      var existing = document.getElementById('pce-autofill-banner');
      if (existing) existing.remove();
      var banner = document.createElement('div');
      banner.id = 'pce-autofill-banner';
      banner.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#0f172a;color:#fff;padding:12px 16px;border-radius:10px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;box-shadow:0 10px 25px rgba(15,23,42,0.35);border:1px solid #334155;max-width:360px;';
      banner.innerHTML = '<div style="font-weight:700;color:#34d399;margin-bottom:3px;">&#10003; Auto-Filled ' + filledLabels.length + ' Fields</div><div style="font-size:12px;color:#cbd5e1;">' + (data.firstName || '') + ' ' + (data.lastName || '') + ' (' + (data.company || '') + ')</div><div style="font-size:11px;color:#94a3b8;margin-top:4px;">Verify required fields &amp; click Submit.</div>';
      document.body.appendChild(banner);
      setTimeout(function() { if (banner.parentNode) banner.remove(); }, 6000);
    }, 300);

    return { filled: filledLabels.length, fields: filledLabels };
  }
`;
}

/**
 * Generates a self-contained console script that immediately fills the external registration form.
 */
export function buildConsoleAutoFillScript(data: RegFormData): string {
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c');
  return `(function(){${buildAutoFillCoreBody()}fillRegForm(${safeJson});})();`;
}

/**
 * Generates a universal reusable bookmarklet URL.
 * Users drag it once to their browser bookmarks bar; on any registration form they click it,
 * and it reads the copied Delegate JSON from clipboard (with prompt fallback) to auto-fill!
 */
export function buildUniversalBookmarkletHref(): string {
  const code = `(async function(){${buildAutoFillCoreBody()}var raw='';try{if(navigator.clipboard&&navigator.clipboard.readText){raw=await navigator.clipboard.readText();}}catch(e){}if(!raw||raw.trim()[0]!=='{'){raw=window.prompt('Paste Delegate Form Data copied from the Partner Portal:','')||'';}if(!raw)return;try{var parsed=JSON.parse(raw);fillRegForm(parsed);}catch(err){alert('Invalid delegate data. Click "Copy Form Data" in the Partner Portal first.');}})();`;
  const compact = code.replace(/\s+/g, ' ').trim();
  return `javascript:${encodeURIComponent(compact)}`;
}

/**
 * Parses either JSON copied from our portal OR a tab-separated spreadsheet row
 * directly into RegFormData (for the built-in Copy-Paste Test Form).
 */
export function parsePastedRegistrationPayload(
  rawText: string,
  fallbackCity = ''
): Partial<RegFormData> | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // 1. JSON payload from our portal
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<RegFormData>;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // fall through to TSV/Key-Value parsing
    }
  }

  // 2. Key: Value lines (e.g. "First Name: Sarah")
  if (trimmed.includes(':') && trimmed.includes('\n')) {
    const out: Partial<RegFormData> = {};
    const lines = trimmed.split(/\r?\n/);
    let matched = 0;
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim().toLowerCase();
      const v = line.slice(idx + 1).trim();
      if (!v) continue;
      const yn: 'Yes' | 'No' = /^(yes|y|true|1)$/i.test(v) ? 'Yes' : 'No';

      if (k.includes('first name')) { out.firstName = v; matched++; }
      else if (k.includes('last name')) { out.lastName = v; matched++; }
      else if (k.includes('password')) { out.password = v; out.confirmPassword = v; matched++; }
      else if (k.includes('job title')) { out.jobTitle = v; matched++; }
      else if (k.includes('company')) { out.company = v; matched++; }
      else if (k.includes('city')) { out.city = v; matched++; }
      else if (k.includes('country')) { out.country = v; matched++; }
      else if (k.includes('email')) { out.email = v; matched++; }
      else if (k.includes('phone')) { out.phone = v; matched++; }
      else if (k.includes('category')) { out.registrationCategory = v; matched++; }
      else if (k.includes('combo')) { out.basicComboTicket = yn; matched++; }
      else if (k.includes('linkedin')) { out.linkedInUrl = v; matched++; }
      else if (k.includes('share')) { out.shareDetailsWithPartners = yn; matched++; }
      else if (k.includes('dietary detail')) { out.dietaryDetails = v; matched++; }
      else if (k.includes('dietary')) { out.hasDietary = yn; matched++; }
      else if (k.includes('stadium')) { out.stadiumTour = yn; matched++; }
    }
    if (matched >= 2) return out;
  }

  // 3. Single Excel / TSV row (20-column portal order OR common spreadsheet order)
  const cells = trimmed.split('\t').map((c) => c.trim());
  if (cells.length >= 4) {
    const toYN = (s?: string): 'Yes' | 'No' =>
      /^(yes|y|true|1|x)$/i.test((s || '').trim()) ? 'Yes' : 'No';
    const emailIdx = cells.findIndex((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
    if (emailIdx === 5) {
      // Standard 20-column order: First, Last, JobTitle, Company, Country, Email, Category, Phone, Awards, D1, D2, D3, Stadium, Dietary, DietaryDetails, Exp, Industry, Promo, Share, Newsletter
      return {
        firstName: cells[0] || '',
        lastName: cells[1] || '',
        jobTitle: cells[2] || 'Delegate',
        company: cells[3] || '',
        city: fallbackCity,
        country: cells[4] || 'Australia',
        email: cells[5] || '',
        registrationCategory: cells[6] || 'Partner',
        phone: cells[7] || '',
        basicComboTicket: toYN(cells[10]) === 'Yes' || toYN(cells[11]) === 'Yes' ? 'Yes' : 'No',
        stadiumTour: toYN(cells[12]),
        hasDietary: toYN(cells[13]),
        dietaryDetails: cells[14] || '',
        shareDetailsWithPartners: toYN(cells[18]),
      };
    }
    return {
      firstName: cells[0] || '',
      lastName: cells[1] || '',
      jobTitle: cells[2] || 'Delegate',
      company: cells[3] || '',
      city: fallbackCity,
      email: emailIdx >= 0 ? cells[emailIdx] : cells[4] || '',
      phone: cells[emailIdx >= 0 ? emailIdx + 1 : 5] || '',
    };
  }

  return null;
}

/**
 * Formats a clean human-readable Key: Value sheet for copying/pasting into emails or forms.
 */
export function formatKeyValueCopyText(data: RegFormData): string {
  const lines = [
    `First Name: ${data.firstName}`,
    `Last Name: ${data.lastName}`,
    `Create Password: ${data.password}`,
    `Confirm Password: ${data.confirmPassword}`,
    `Job Title: ${data.jobTitle}`,
    `Company: ${data.company}`,
    `City: ${data.city}`,
    `Country: ${data.country}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Registration Category: ${data.registrationCategory}`,
    `Basic Combo Ticket: ${data.basicComboTicket}`,
    `LinkedIn Profile Link: ${data.linkedInUrl}`,
    `Share my details with Expo's carefully chosen partners: ${data.shareDetailsWithPartners}`,
    `Do you have any dietary requirements?: ${data.hasDietary}`,
    ...(data.hasDietary === 'Yes' && data.dietaryDetails
      ? [`Dietary Details: ${data.dietaryDetails}`]
      : []),
    `Stadium Tour: ${data.stadiumTour}`,
  ];
  return lines.join('\n');
}
