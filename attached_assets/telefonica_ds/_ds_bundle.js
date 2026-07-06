/* @ds-bundle: {"format":4,"namespace":"TelefNicaDesignSystem_29ea10","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"Tag","sourcePath":"components/data-display/Tag.jsx"},{"name":"Callout","sourcePath":"components/feedback/Callout.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"assets/icons.js":"9e0a3aee87da","components/actions/Button.jsx":"cb9aa9020635","components/actions/IconButton.jsx":"063cd5fea1be","components/data-display/Avatar.jsx":"94371898c6c6","components/data-display/Badge.jsx":"a89b13c67aba","components/data-display/Card.jsx":"e38a64e8fa8c","components/data-display/Tag.jsx":"0265039e0c52","components/feedback/Callout.jsx":"64562791460d","components/feedback/ProgressBar.jsx":"73b3c76db8e8","components/forms/Checkbox.jsx":"c477299c4f13","components/forms/Radio.jsx":"c3755e3a4aa6","components/forms/Select.jsx":"8a8bc99aac8b","components/forms/Switch.jsx":"84161df7340e","components/forms/TextField.jsx":"f4bfd4c46818","components/navigation/Tabs.jsx":"070f8db4b157","ui_kits/website/Footer.jsx":"f23238aa7a88","ui_kits/website/Header.jsx":"00e76dd52f0f","ui_kits/website/Hero.jsx":"3c78ff1e42d2","ui_kits/website/Sections.jsx":"80a3f1416f63"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TelefNicaDesignSystem_29ea10 = window.TelefNicaDesignSystem_29ea10 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/icons.js
try { (() => {
/* ============================================================
   Telefónica DS — placeholder UI icon set (window.TFIcons)
   Lucide-style line glyphs (24px, 2px stroke, round caps) built with
   React.createElement so they load via a plain <script> (no Babel) and
   do NOT register as design-system components.

   ⚠ SUBSTITUTE: Telefónica's real icons live in the open-source
   `Telefonica/mistica-icons` library. Swap these for the licensed set
   for production. Each icon accepts standard svg props (style, width…).
   ============================================================ */
window.TFIcons = function () {
  const h = React.createElement;
  const make = children => props => h('svg', Object.assign({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    width: '1em',
    height: '1em',
    'aria-hidden': 'true'
  }, props), children.map((c, i) => typeof c === 'string' ? h('path', {
    key: i,
    d: c
  }) : h(c.t, Object.assign({
    key: i
  }, c.a))));
  return {
    Menu: make(['M3 6h18', 'M3 12h18', 'M3 18h18']),
    Close: make(['M18 6 6 18', 'm6 6 12 12']),
    Search: make([{
      t: 'circle',
      a: {
        cx: 11,
        cy: 11,
        r: 7
      }
    }, 'm21 21-4.35-4.35']),
    ChevronDown: make(['m6 9 6 6 6-6']),
    ChevronRight: make(['m9 6 6 6-6 6']),
    ArrowRight: make(['M5 12h14', 'm13 6 6 6-6 6']),
    ArrowUpRight: make(['M7 17 17 7', 'M7 7h10v10']),
    Globe: make([{
      t: 'circle',
      a: {
        cx: 12,
        cy: 12,
        r: 9
      }
    }, 'M3 12h18', 'M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18']),
    Play: make([{
      t: 'path',
      a: {
        d: 'M6 4.5 19 12 6 19.5z',
        fill: 'currentColor',
        stroke: 'none'
      }
    }]),
    Plus: make(['M12 5v14', 'M5 12h14']),
    Check: make(['M20 6 9 17l-5-5']),
    Bolt: make([{
      t: 'path',
      a: {
        d: 'M13 2 4 14h7l-1 8 9-12h-7z'
      }
    }]),
    Shield: make(['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z']),
    Leaf: make(['M11 20A7 7 0 0 1 4 13C4 7 9 3 20 3c0 11-4 16-9 16z', 'M11 20c0-4 2-7 6-9']),
    Users: make([{
      t: 'circle',
      a: {
        cx: 9,
        cy: 8,
        r: 3.2
      }
    }, 'M3.5 20a5.5 5.5 0 0 1 11 0', 'M16 5.2a3.2 3.2 0 0 1 0 6', 'M17.5 20a5.5 5.5 0 0 0-2-4.3']),
    Wifi: make(['M5 12.5a10 10 0 0 1 14 0', 'M8.5 16a5 5 0 0 1 7 0', {
      t: 'circle',
      a: {
        cx: 12,
        cy: 19,
        r: 1,
        fill: 'currentColor',
        stroke: 'none'
      }
    }]),
    Phone: make(['M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 16l2 5v-3a2 2 0 0 1 0 0', 'M5 3a16 16 0 0 0 16 16']),
    Building: make([{
      t: 'rect',
      a: {
        x: 4,
        y: 3,
        width: 16,
        height: 18,
        rx: 1
      }
    }, 'M9 8h.01', 'M15 8h.01', 'M9 12h.01', 'M15 12h.01', 'M9 16h6']),
    Chart: make(['M4 20V10', 'M10 20V4', 'M16 20v-8', 'M22 20H2']),
    Globe2: make([{
      t: 'circle',
      a: {
        cx: 12,
        cy: 12,
        r: 9
      }
    }, 'M12 3v18', 'M3 12h18'])
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/icons.js", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Button — pill-shaped, bold. The primary action is solid blue.
 * Renders as <button> by default, or <a> when `href` is provided.
 */
function Button({
  children,
  variant = 'primary',
  // primary | secondary | danger | link | inverse
  size = 'md',
  // sm | md | lg
  block = false,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  href,
  type = 'button',
  className = '',
  ...rest
}) {
  const cls = ['tf-btn', `tf-btn--${variant}`, `tf-btn--${size}`, block ? 'tf-btn--block' : '', loading ? 'is-loading' : '', className].filter(Boolean).join(' ');
  const Tag = href ? 'a' : 'button';
  const tagProps = href ? {
    href,
    'aria-disabled': disabled || loading ? 'true' : undefined
  } : {
    type,
    disabled: disabled || loading
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, tagProps, rest), loading && /*#__PURE__*/React.createElement("span", {
    className: "tf-btn__spinner",
    "aria-hidden": "true"
  }), iconLeft && /*#__PURE__*/React.createElement("span", {
    className: "tf-btn__icon"
  }, iconLeft), children != null && /*#__PURE__*/React.createElement("span", {
    className: "tf-btn__label"
  }, children), iconRight && /*#__PURE__*/React.createElement("span", {
    className: "tf-btn__icon"
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica IconButton — a circular, icon-only control. Always pass `label`
 * for accessibility. Provide the glyph as children (e.g. an <svg> or <img>).
 */
function IconButton({
  children,
  label,
  variant = 'ghost',
  // ghost | solid | outline
  size = 'md',
  // sm | md | lg
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['tf-iconbtn', `tf-iconbtn--${variant}`, `tf-iconbtn--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": label,
    disabled: disabled
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Avatar — circular image or initials fallback.
 */
function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',
  // sm | md | lg | xl
  className = '',
  ...rest
}) {
  const cls = ['tf-avatar', `tf-avatar--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt
  }) : (initials || '').slice(0, 2).toUpperCase());
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Badge — a numeric counter or a simple dot. Use `max` to cap
 * large counts (e.g. 99+).
 */
function Badge({
  count,
  dot = false,
  max = 99,
  className = '',
  ...rest
}) {
  const cls = ['tf-badge', dot ? 'tf-badge--dot' : '', className].filter(Boolean).join(' ');
  if (dot) return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest));
  const label = typeof count === 'number' && count > max ? `${max}+` : count;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), label);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Card — flexible content card with optional media, eyebrow,
 * title, description and footer. Becomes interactive when `href`/`onClick` set.
 */
function Card({
  media,
  mediaAlt = '',
  eyebrow,
  title,
  description,
  footer,
  elevated = false,
  href,
  onClick,
  children,
  className = '',
  ...rest
}) {
  const interactive = Boolean(href || onClick);
  const cls = ['tf-card', elevated ? 'tf-card--elevated' : '', interactive ? 'tf-card--interactive' : '', className].filter(Boolean).join(' ');
  const Tag = href ? 'a' : 'div';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    href: href,
    onClick: onClick
  }, rest), media && /*#__PURE__*/React.createElement("div", {
    className: "tf-card__media"
  }, /*#__PURE__*/React.createElement("img", {
    src: media,
    alt: mediaAlt
  })), /*#__PURE__*/React.createElement("div", {
    className: "tf-card__body"
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "tf-card__eyebrow"
  }, eyebrow), title && /*#__PURE__*/React.createElement("h3", {
    className: "tf-card__title"
  }, title), description && /*#__PURE__*/React.createElement("p", {
    className: "tf-card__desc"
  }, description), children), footer && /*#__PURE__*/React.createElement("div", {
    className: "tf-card__footer"
  }, footer));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Tag — small status pill. Set `dot` to show a leading indicator.
 */
function Tag({
  children,
  variant = 'info',
  // promo | success | warning | error | info | inactive
  dot = false,
  className = '',
  ...rest
}) {
  const cls = ['tf-tag', `tf-tag--${variant}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "tf-tag__dot"
  }), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Callout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Callout — inline informational banner. Pass an `icon` node, or a
 * variant-coloured dot is shown by default. Optional `action` and `onClose`.
 */
function Callout({
  variant = 'info',
  // info | success | warning | error
  title,
  children,
  icon,
  action,
  onClose,
  className = '',
  ...rest
}) {
  const cls = ['tf-callout', `tf-callout--${variant}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "status"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "tf-callout__icon"
  }, icon || /*#__PURE__*/React.createElement("span", {
    className: "tf-callout__mark"
  })), /*#__PURE__*/React.createElement("div", {
    className: "tf-callout__body"
  }, title && /*#__PURE__*/React.createElement("p", {
    className: "tf-callout__title"
  }, title), children && /*#__PURE__*/React.createElement("div", {
    className: "tf-callout__desc"
  }, children), action && /*#__PURE__*/React.createElement("div", {
    className: "tf-callout__action"
  }, action)), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "tf-callout__close",
    "aria-label": "Dismiss",
    onClick: onClose
  }, "\u2715"));
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Callout.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica ProgressBar — determinate progress (0–100). Optional label row.
 */
function ProgressBar({
  value = 0,
  label,
  showValue = false,
  className = '',
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['tf-progress-field', className].filter(Boolean).join(' ')
  }, rest), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    className: "tf-progress__head"
  }, label ? /*#__PURE__*/React.createElement("span", null, label) : /*#__PURE__*/React.createElement("span", null), showValue && /*#__PURE__*/React.createElement("span", null, pct, "%")), /*#__PURE__*/React.createElement("div", {
    className: "tf-progress",
    role: "progressbar",
    "aria-valuenow": pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-progress__fill",
    style: {
      width: pct + '%'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Telefónica Checkbox — square control with a white tick on blue when checked. */
function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  name,
  value,
  className = '',
  ...rest
}) {
  const cls = ['tf-check', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled,
    name: name,
    value: value
  }, rest)), label && /*#__PURE__*/React.createElement("span", {
    className: "tf-check__label"
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Radio — round control. Group several with the same `name`.
 */
function Radio({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  name,
  value,
  className = '',
  ...rest
}) {
  const cls = ['tf-radio', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled,
    name: name,
    value: value
  }, rest)), label && /*#__PURE__*/React.createElement("span", {
    className: "tf-radio__label"
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica Select — native select with the brand's outlined styling.
 * Pass <option> elements as children.
 */
function Select({
  label,
  children,
  value,
  onChange,
  helperText,
  error = false,
  disabled = false,
  required = false,
  placeholder,
  id,
  name,
  className = '',
  ...rest
}) {
  const fid = id || name;
  const cls = ['tf-field', error ? 'is-error' : '', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "tf-field__label",
    htmlFor: fid
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "tf-field__req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: "tf-select-wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    name: name,
    className: "tf-select",
    value: value,
    onChange: onChange,
    disabled: disabled,
    required: required
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), children), /*#__PURE__*/React.createElement("span", {
    className: "tf-select__chevron",
    "aria-hidden": "true"
  })), helperText && /*#__PURE__*/React.createElement("span", {
    className: "tf-field__help"
  }, helperText));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Telefónica Switch — on/off toggle. Track turns blue when on. */
function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  name,
  className = '',
  ...rest
}) {
  const cls = ['tf-switch', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled,
    name: name
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "tf-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tf-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "tf-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Telefónica TextField — outlined input with label, helper and error states.
 * Supports prefix/suffix adornments (icon or text).
 */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  helperText,
  error = false,
  disabled = false,
  required = false,
  prefix = null,
  suffix = null,
  id,
  name,
  className = '',
  ...rest
}) {
  const fid = id || name;
  const cls = ['tf-field', error ? 'is-error' : '', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "tf-field__label",
    htmlFor: fid
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "tf-field__req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: "tf-input-wrap"
  }, prefix && /*#__PURE__*/React.createElement("span", {
    className: "tf-input__affix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    name: name,
    className: "tf-input",
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    required: required,
    "aria-invalid": error || undefined
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    className: "tf-input__affix"
  }, suffix)), helperText && /*#__PURE__*/React.createElement("span", {
    className: "tf-field__help"
  }, helperText));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Telefónica Tabs — underline tab bar. Controlled via `value`/`onChange`, or
 * uncontrolled with `defaultValue`. `items` is [{ id, label, badge?, disabled? }].
 */
function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  className = '',
  ...rest
}) {
  const [internal, setInternal] = useState(defaultValue ?? (items[0] && items[0].id));
  const active = value !== undefined ? value : internal;
  const select = id => {
    if (value === undefined) setInternal(id);
    if (onChange) onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['tf-tabs', className].filter(Boolean).join(' '),
    role: "tablist"
  }, rest), items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    type: "button",
    role: "tab",
    "aria-selected": active === it.id,
    disabled: it.disabled,
    className: ['tf-tab', active === it.id ? 'tf-tab--active' : ''].filter(Boolean).join(' '),
    onClick: () => select(it.id)
  }, it.label, it.badge != null && /*#__PURE__*/React.createElement("span", {
    className: "tf-tab__badge"
  }, it.badge))));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
/* Telefónica corporate site — Footer */
function TFFooter() {
  const cols = [{
    h: 'Company',
    links: ['About Telefónica', 'Our leadership', 'Careers', 'Suppliers']
  }, {
    h: 'Investors',
    links: ['Shareholders', 'Results', 'Share price', 'Bonds & ratings']
  }, {
    h: 'Innovation',
    links: ['Open Gateway', 'Telefónica Tech', 'Wayra', 'Patents']
  }, {
    h: 'Newsroom',
    links: ['Press releases', 'Media library', 'Events', 'Contact']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    className: "tf-ftr"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-ftr__top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-ftr__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/telefonica-logo-white.png",
    alt: "Telef\xF3nica"
  }), /*#__PURE__*/React.createElement("p", {
    className: "tf-ftr__tagline"
  }, "Connecting people and unlocking the opportunities of technology.")), cols.map(c => /*#__PURE__*/React.createElement("div", {
    className: "tf-ftr__col",
    key: c.h
  }, /*#__PURE__*/React.createElement("h4", null, c.h), c.links.map(l => /*#__PURE__*/React.createElement("a", {
    href: "#",
    key: l
  }, l))))), /*#__PURE__*/React.createElement("div", {
    className: "tf-ftr__bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Telef\xF3nica, S.A. \u2014 Gran V\xEDa 28, Madrid. All rights reserved."), /*#__PURE__*/React.createElement("div", {
    className: "tf-ftr__social"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "LinkedIn"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "X"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "YouTube"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Instagram")))));
}
Object.assign(window, {
  TFFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
/* Telefónica corporate site — Header (sticky nav + search) */
function TFHeader({
  searchOpen,
  onSearchToggle
}) {
  const I = window.TFIcons;
  const nav = ['Shareholders & Investors', 'About Telefónica', 'Innovation', 'Sustainability', 'Newsroom'];
  return /*#__PURE__*/React.createElement("header", {
    className: "tf-hdr"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-container tf-hdr__row"
  }, /*#__PURE__*/React.createElement("a", {
    className: "tf-hdr__logo",
    href: "#",
    "aria-label": "Telef\xF3nica home"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/telefonica-logo.png",
    alt: "Telef\xF3nica"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "tf-hdr__nav"
  }, nav.map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    className: "tf-hdr__link"
  }, n, /*#__PURE__*/React.createElement(I.ChevronDown, {
    style: {
      fontSize: 15,
      opacity: .55
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "tf-hdr__spacer"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tf-hdr__utils"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tf-hdr__iconbtn",
    "aria-label": searchOpen ? 'Close search' : 'Search',
    onClick: onSearchToggle
  }, searchOpen ? /*#__PURE__*/React.createElement(I.Close, null) : /*#__PURE__*/React.createElement(I.Search, null)), /*#__PURE__*/React.createElement("button", {
    className: "tf-lang"
  }, /*#__PURE__*/React.createElement(I.Globe, {
    style: {
      fontSize: 17
    }
  }), " EN"))), searchOpen && /*#__PURE__*/React.createElement("div", {
    className: "tf-search"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-container tf-search__inner"
  }, /*#__PURE__*/React.createElement(I.Search, {
    style: {
      fontSize: 22,
      color: 'var(--text-secondary)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "tf-search__input",
    placeholder: "Search telefonica.com\u2026",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px var(--font-sans)',
      color: 'var(--text-secondary)'
    }
  }, "Press Enter \u21B5"))));
}
Object.assign(window, {
  TFHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
/* Telefónica corporate site — Hero */
function TFHero() {
  const {
    Button
  } = window.TelefNicaDesignSystem_29ea10;
  const I = window.TFIcons;
  return /*#__PURE__*/React.createElement("section", {
    className: "tf-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-hero__panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-hero__bg"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tf-hero__glow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tf-hero__content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-hero__eyebrow"
  }, "Newsroom \xB7 4 min read"), /*#__PURE__*/React.createElement("h1", {
    className: "tf-hero__title"
  }, "Connecting people and unlocking the opportunities of technology"), /*#__PURE__*/React.createElement("p", {
    className: "tf-hero__sub"
  }, "Our networks reach hundreds of millions of people across Europe and Latin America \u2014 and we're building the digital backbone for what comes next."), /*#__PURE__*/React.createElement("div", {
    className: "tf-hero__cta"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    iconRight: /*#__PURE__*/React.createElement(I.ArrowRight, null)
  }, "Read the story"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconLeft: /*#__PURE__*/React.createElement(I.Play, null)
  }, "Watch the film"))))));
}
Object.assign(window, {
  TFHero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Sections.jsx
try { (() => {
/* Telefónica corporate site — content sections */
const grad = (c1, c2) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='400' height='250' fill='url(#g)'/><g fill='rgba(255,255,255,.10)'><circle cx='330' cy='60' r='5'/><circle cx='360' cy='60' r='5'/><circle cx='345' cy='90' r='5'/><circle cx='345' cy='120' r='5'/></g></svg>`);
function TFFocusAreas() {
  const I = window.TFIcons;
  const items = [{
    icon: /*#__PURE__*/React.createElement(I.Wifi, null),
    title: 'Networks',
    desc: 'Fibre and 5G that reach further, carrying more data with less energy per bit.'
  }, {
    icon: /*#__PURE__*/React.createElement(I.Bolt, null),
    title: 'Open Gateway',
    desc: 'Standardised APIs that put network capabilities directly in developers\u2019 hands.'
  }, {
    icon: /*#__PURE__*/React.createElement(I.Leaf, null),
    title: 'Sustainability',
    desc: 'Net-zero targets and a circular approach to devices across our operations.'
  }, {
    icon: /*#__PURE__*/React.createElement(I.Users, null),
    title: 'Digital society',
    desc: 'Bridging the digital divide and building skills for millions of people.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "tf-container tf-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-sec__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "tf-sec__eyebrow"
  }, "What we do"), /*#__PURE__*/React.createElement("h2", {
    className: "tf-sec__title"
  }, "A single company behind four commitments")), /*#__PURE__*/React.createElement("p", {
    className: "tf-sec__lead"
  }, "From the network to the neighbourhood, technology only matters when it reaches people.")), /*#__PURE__*/React.createElement("div", {
    className: "tf-focus-grid"
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    className: "tf-focus",
    key: it.title
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-focus__icon",
    style: {
      fontSize: 26
    }
  }, it.icon), /*#__PURE__*/React.createElement("h3", {
    className: "tf-focus__title"
  }, it.title), /*#__PURE__*/React.createElement("p", {
    className: "tf-focus__desc"
  }, it.desc), /*#__PURE__*/React.createElement("span", {
    className: "tf-focus__more"
  }, "Learn more ", /*#__PURE__*/React.createElement(I.ArrowRight, {
    style: {
      fontSize: 16
    }
  }))))));
}
function TFStats() {
  return /*#__PURE__*/React.createElement("section", {
    className: "tf-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-stats__bg"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tf-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-stat__num"
  }, "300", /*#__PURE__*/React.createElement("em", null, "M+")), /*#__PURE__*/React.createElement("div", {
    className: "tf-stat__label"
  }, "Customers across our footprint")), /*#__PURE__*/React.createElement("div", {
    className: "tf-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-stat__num"
  }, "12"), /*#__PURE__*/React.createElement("div", {
    className: "tf-stat__label"
  }, "Countries in Europe & Latin America")), /*#__PURE__*/React.createElement("div", {
    className: "tf-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-stat__num"
  }, "1924"), /*#__PURE__*/React.createElement("div", {
    className: "tf-stat__label"
  }, "Founded in Madrid \u2014 a century of connection"))));
}
const NEWS = [{
  cat: 'Networks',
  c: 'Networks',
  title: '5G Standalone reaches 2,000 more towns across the country',
  date: '12 Jun 2026',
  g: ['#0066FF', '#001B41']
}, {
  cat: 'Innovation',
  c: 'Innovation',
  title: 'Open Gateway APIs cross one billion monthly calls',
  date: '09 Jun 2026',
  g: ['#00C1B5', '#0047B3']
}, {
  cat: 'Sustainability',
  c: 'Sustainability',
  title: 'On track for net-zero: renewable energy now powers our core',
  date: '03 Jun 2026',
  g: ['#1AB759', '#004E7A']
}, {
  cat: 'Innovation',
  c: 'Innovation',
  title: 'A new AI assistant lands in the Movistar app',
  date: '28 May 2026',
  g: ['#7D5CFF', '#001B41']
}, {
  cat: 'Networks',
  c: 'Networks',
  title: 'Subsea cable upgrade doubles Atlantic capacity',
  date: '21 May 2026',
  g: ['#0066FF', '#0A2A5E']
}, {
  cat: 'Sustainability',
  c: 'Sustainability',
  title: 'One million devices given a second life through trade-in',
  date: '14 May 2026',
  g: ['#1AB759', '#0047B3']
}];
function TFNewsroom() {
  const {
    Tabs,
    Card,
    Tag
  } = window.TelefNicaDesignSystem_29ea10;
  const I = window.TFIcons;
  const [filter, setFilter] = React.useState('all');
  const tabs = [{
    id: 'all',
    label: 'All'
  }, {
    id: 'Networks',
    label: 'Networks'
  }, {
    id: 'Innovation',
    label: 'Innovation'
  }, {
    id: 'Sustainability',
    label: 'Sustainability'
  }];
  const shown = NEWS.filter(n => filter === 'all' || n.c === filter);
  return /*#__PURE__*/React.createElement("section", {
    className: "tf-container tf-sec",
    style: {
      paddingTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-sec__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "tf-sec__eyebrow"
  }, "Newsroom"), /*#__PURE__*/React.createElement("h2", {
    className: "tf-sec__title"
  }, "Latest stories"))), /*#__PURE__*/React.createElement("div", {
    className: "tf-news__tabs"
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: tabs,
    value: filter,
    onChange: setFilter
  })), /*#__PURE__*/React.createElement("div", {
    className: "tf-news-grid"
  }, shown.map(n => /*#__PURE__*/React.createElement(Card, {
    key: n.title,
    href: "#",
    media: grad(n.g[0], n.g[1]),
    eyebrow: /*#__PURE__*/React.createElement(Tag, {
      variant: "info"
    }, n.cat),
    title: n.title,
    footer: /*#__PURE__*/React.createElement("span", {
      className: "tf-news__date"
    }, n.date, " \xB7 3 min read")
  }))));
}
function TFBrands() {
  return /*#__PURE__*/React.createElement("section", {
    className: "tf-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tf-brands"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tf-brands__label"
  }, "Our commercial brands"), /*#__PURE__*/React.createElement("div", {
    className: "tf-brands__list"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tf-brands__item"
  }, "Movistar"), /*#__PURE__*/React.createElement("span", {
    className: "tf-brands__item"
  }, "O", /*#__PURE__*/React.createElement("sub", {
    style: {
      fontSize: '.6em'
    }
  }, "2")), /*#__PURE__*/React.createElement("span", {
    className: "tf-brands__item"
  }, "Vivo"), /*#__PURE__*/React.createElement("span", {
    className: "tf-brands__item"
  }, "Tuenti"))));
}
Object.assign(window, {
  TFFocusAreas,
  TFStats,
  TFNewsroom,
  TFBrands
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
