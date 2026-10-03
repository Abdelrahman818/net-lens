# Network Monitoring App Style Guide

This style guide is based on the selected **Topology Map / Network Operations Center** direction.

The overall experience should feel:

- Trustworthy
- Calm under pressure
- Precise
- Technical but approachable
- Fast to scan
- Clear during incidents
- Professional enough for enterprise network operations

The visual identity should communicate: **“The network is visible, understandable, and under control.”**

---

## 1. Design Principles

### 1.1 Visibility first

Important network information should be visible without excessive navigation.

Prioritize:

1. Network health
2. Active incidents
3. Device relationships
4. Impacted areas
5. Device-level details

### 1.2 Status must be immediately understandable

Use color, labels, icons, and position together. Never rely on color alone.

For example, an offline device should have:

- A red status color
- An “Offline” label
- A visible status icon
- A clear last-seen time

### 1.3 Spatial context matters

The topology map is the primary mental model. Users should understand:

- Where the device is located in the network
- What it connects to
- Which devices depend on it
- Which network segment it belongs to
- Whether the problem is isolated or widespread

### 1.4 Dense, but not overwhelming

Network operators need a lot of information, but the interface should still have clear grouping and breathing room.

Use:

- Strong section headers
- Compact rows
- Consistent alignment
- Meaningful whitespace
- Progressive detail panels

### 1.5 Calm during incidents

The interface should not feel visually chaotic when there are alerts.

Use:

- Restrained alert colors
- Clear severity levels
- Focused incident panels
- Highlighted impacted paths
- One obvious recommended action

---

## 2. Color System

### 2.1 Primary colors
_____________________________________________________________________________
|      Token      |   Color   |                Usage                        |
|-----------------|-----------|---------------------------------------------|
| `navy-teal-900` | `#173F43` | Main navigation, headers, strong emphasis   |
| `teal-800`      | `#205951` | Primary text, active navigation             |
| `teal-700`      | `#277E78` | Icons, interactive elements, topology nodes |
| `teal-600`      | `#338B89` | Secondary actions and data visualization    |
| `mint-100`      | `#DFF7ED` | Healthy status backgrounds                  |
| `mint-200`      | `#DCEEE8` | Selected surfaces and active states         |
_____________________________________________________________________________

### 2.2 Neutral colors

| Token | Color | Usage |
|---|---|---|
| `canvas` | `#EEF3F3` | Main application background |
| `surface` | `#F8FBFA` | Panels, sidebars, cards |
| `surface-raised` | `#FFFFFF` | Tables, inspectors, floating panels |
| `border` | `#D7E4E1` | Dividers and card borders |
| `border-soft` | `#CFE0DC` | Map panels and larger containers |
| `text-primary` | `#193C40` | Main headings and important values |
| `text-secondary` | `#57716F` | Supporting information |
| `text-muted` | `#829996` | Labels, timestamps, secondary metadata |

### 2.3 Status colors

#### Online

- Main: `#2DBB79`
- Text: `#167653`
- Background: `#DFF7ED`

#### Warning

- Main: `#D89C38`
- Text: `#9A6515`
- Background: `#FFF0CF`

#### Offline

- Main: `#CF6971`
- Text: `#B04650`
- Background: `#FBE2E3`

#### Critical incident

- Main: `#B94A55`
- Text: `#8E303A`
- Background: `#F7D9DC`

#### Informational

- Main: `#4F83A5`
- Text: `#35657F`
- Background: `#E4F0F7`

### 2.4 Color rules

- Use teal for normal interaction and application identity.
- Use green only for healthy or operational states.
- Use amber for degraded conditions requiring attention.
- Use red or coral only for offline, critical, or high-impact problems.
- Do not use red for normal navigation or decoration.
- Do not use more than one strong accent color in the same panel.
- Status colors should remain consistent everywhere in the product.

---

## 3. Typography

### 3.1 Primary font

Use **DM Sans** for the application interface.

Use it for:

- Navigation
- Headings
- Buttons
- Labels
- Table content
- Device names
- Alerts
- Descriptions

Recommended weights:

- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### 3.2 Technical font

Use **Space Mono** for technical values.

Use it for:

- IP addresses
- MAC addresses
- Ports
- Device IDs
- Timestamps
- Scan durations
- Latency values
- Network ranges
- System identifiers

Example:

```text
10.0.0.24
3C:52:82:19:AA:71
09:42:18 UTC
```

### 3.3 Type scale

| Usage | Size |
|---|---:|
| Page title | 28–32px |
| Section title | 20–24px |
| Card title | 15–17px |
| Body text | 13–14px |
| Table text | 12–13px |
| Metadata | 10–11px |
| Technical values | 11–13px |

### 3.4 Typography rules

- Use sentence case for most headings.
- Use uppercase only for small metadata labels.
- Use letter spacing for labels, not for body text.
- Use bold typography for values, not entire paragraphs.
- Keep technical values visually distinct from descriptive content.
- Avoid using more than three font sizes inside one small card.

---

## 4. Layout System

### 4.1 Application structure

The standard desktop layout should use:

1. Top navigation
2. Left workspace navigation
3. Main content area
4. Optional right-side inspector

Recommended proportions:

- Left navigation: 220–240px
- Right inspector: 280–320px
- Main content: flexible
- Top navigation: 68–76px

### 4.2 Main content spacing

Use a consistent spacing scale:

| Token | Value |
|---|---:|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |

Recommended page padding:

- Desktop: 28–32px
- Tablet: 20–24px
- Mobile: 16px

### 4.3 Border radius

Use moderate rounded corners.

| Element | Radius |
|---|---:|
| Small controls | 6–8px |
| Buttons | 7–9px |
| Cards | 12–16px |
| Large map panels | 16–20px |
| Avatars/status dots | Fully rounded |

Avoid excessive pill-shaped containers except for:

- Status labels
- Monitoring state
- Filters
- Tags
- Counts

---

## 5. Navigation

### 5.1 Primary navigation

Recommended main navigation:

- Network Overview
- Topology Map
- All Devices
- Alerts and Incidents
- Network Segments
- Discovery and Scans
- Performance
- Settings

### 5.2 Active navigation state

The active item should use:

- Light mint background
- Teal text
- Semibold font
- Small icon
- Optional left border or subtle accent

Avoid strong shadows or bright fills for navigation states.

### 5.3 Navigation labels

Use clear labels such as:

- “Topology Map”
- “All Devices”
- “Health Alerts”
- “Discovery Scans”

Avoid unclear labels such as:

- “Monitor”
- “Control”
- “Insights”
- “Operations”

---

## 6. Cards and Panels

### 6.1 Metric cards

Metric cards should show:

- Short label
- Large value
- Supporting context
- Small status or trend icon

Example:

```text
REACHABILITY
95.6%
237 online right now
```

Use a maximum of four to five primary metric cards in a row.

### 6.2 Card behavior

Cards should have:

- Subtle border
- Minimal shadow
- Clear hover state
- Consistent internal padding
- Strong alignment between values

Avoid cards that use:

- Heavy gradients
- Excessive shadows
- Decorative illustrations
- Too many competing colors

### 6.3 Inspector panels

The device inspector should remain visible when a device is selected.

It should include:

- Device identity
- Status
- Core network information
- Health signals
- Connection path
- Main next action

Use a darker teal inspector only for high-priority incident views. The standard inspector should use a light surface.

---

## 7. Device Representation

### 7.1 Device icons

Use simple line icons from Lucide or a consistent icon library.

Recommended mappings:

| Device type | Icon direction |
|---|---|
| Router | Router |
| Switch | Network or Ethernet |
| Server | Server |
| Access point | Wifi |
| Printer | Printer |
| Camera | Camera |
| Laptop | Laptop |
| Phone | Smartphone |
| Unknown device | Circle help or Network |

### 7.2 Device nodes

Each topology node should include:

- Device icon
- Status indicator
- Device name
- IP address
- Selected state

Selected nodes should use:

- Teal border
- Soft teal ring
- Slight size increase
- Persistent detail panel

### 7.3 Device labels

Use the following order:

```text
core-sw-01
10.0.0.2
```

Device names should use normal interface typography. IP addresses should use Space Mono.

---

## 8. Topology Map Guidelines

### 8.1 Map background

Use:

- Soft off-white or pale sea-glass surface
- Very subtle grid
- Low-contrast segment boundaries
- No heavy gradients

The map should remain visually quieter than alerts and device panels.

### 8.2 Connections

Healthy connection:

- Teal or muted sea-green
- Thin line
- Low visual weight

Warning connection:

- Amber line
- Slightly stronger opacity
- Optional animated pulse

Offline or impacted connection:

- Coral or red line
- Dashed or animated line
- Stronger contrast

### 8.3 Map controls

Recommended controls:

- Auto-layout
- Reset view
- Zoom
- Fit to screen
- Segment filter
- Device-type filter
- Map/list toggle
- Traffic direction toggle

Controls should remain compact and located inside the map container.

### 8.4 Alert lens

When viewing an incident:

- Fade healthy nodes slightly
- Highlight impacted devices
- Emphasize the unhealthy path
- Show blast-radius boundaries
- Keep the selected device visually dominant
- Display the recommended remediation route

---

## 9. Tables and Device Lists

### 9.1 Table columns

Recommended default columns:

- Device
- Type
- IP address
- MAC address
- Vendor
- Status
- Last seen
- Segment

### 9.2 Table design

Use:

- Soft horizontal separators
- Compact row height
- Clear hover state
- Sticky headers for long lists
- Status labels instead of color-only indicators
- Monospace for IP and MAC addresses

### 9.3 Table interaction

Rows should support:

- Click to open device details
- Context menu for actions
- Keyboard focus
- Quick status filtering
- Sorting by status, last seen, or device type

---

## 10. Alerts and Incidents

### 10.1 Severity levels

| Severity | Meaning |
|---|---|
| Informational | Useful event, no immediate action |
| Warning | Degraded performance or unusual behavior |
| High | Significant impact or likely outage |
| Critical | Active outage or major network impact |

### 10.2 Alert presentation

Each alert should show:

- Severity
- Device or segment
- Short description
- Time detected
- Current duration
- Impact
- Recommended action
- Owner or responsible team
- Resolve action

### 10.3 Incident workflow

Recommended states:

1. Detected
2. Investigating
3. Acknowledged
4. Mitigating
5. Resolved
6. Closed

Use clear action labels such as:

- Acknowledge
- Assign
- Open investigation
- Queue fastest fix
- Mark resolved
- Reopen incident

---

## 11. Charts and Telemetry

Charts should be simple and operational.

Recommended chart types:

- Line charts for latency and availability
- Bar charts for device counts
- Area charts for traffic
- Horizontal bars for segment health
- Timeline charts for incidents
- Small signal bars for device health

Chart rules:

- Use teal for normal telemetry.
- Use amber for degradation.
- Use coral for outage periods.
- Keep grid lines subtle.
- Always show time ranges.
- Include units such as milliseconds, percentage, Mbps, or seconds.
- Provide a text summary alongside important charts.

---

## 12. Buttons and Actions

### Primary button

Use deep teal or medium teal for the main action.

Examples:

- Scan network
- Start discovery
- Open investigation
- Queue fastest fix

### Secondary button

Use a light surface with a teal border or text.

Examples:

- View device record
- Export devices
- Reset view
- View history

### Destructive action

Use coral or red only when an action has serious consequences.

Examples:

- Remove device
- Disable monitoring
- Delete scan configuration

### Button rules

- Use action-oriented labels.
- Keep labels short.
- Use icons only when they clarify the action.
- Do not use icons as a replacement for text in important actions.
- Show loading states for scans and long-running tasks.

---

## 13. Forms and Filters

Filters should be easy to discover and easy to clear.

Recommended filters:

- Status
- Device type
- Vendor
- Network segment
- Location
- Last seen
- Alert severity

Use:

- Search field
- Filter button
- Applied filter chips
- Clear all action
- Result count

Filter labels should use familiar network terminology.

---

## 14. Responsive Behavior

### Desktop

Use the full three-region layout:

- Workspace navigation
- Main map or dashboard
- Device inspector

### Tablet

- Collapse the left navigation
- Keep the topology map central
- Convert the inspector into a slide-over panel
- Keep metric cards in two columns

### Mobile

- Use a top navigation bar
- Show map and list as separate tabs
- Convert inspectors into bottom sheets
- Prioritize alerts and device status
- Keep IP and MAC details accessible but secondary
- Avoid forcing a full desktop topology map onto a narrow screen

---

## 15. Accessibility

The app should meet WCAG AA standards.

Important requirements:

- Do not rely on color alone for device status.
- Maintain strong contrast for text and controls.
- Support keyboard navigation.
- Show visible focus states.
- Use accessible labels for icon-only buttons.
- Provide text alternatives for topology status.
- Ensure tables work with screen readers.
- Make alert severity readable through text and icons.
- Avoid overly small text for important operational data.
- Respect reduced-motion preferences.

---

## 16. Writing Style

The interface language should be:

- Direct
- Calm
- Specific
- Operational
- Non-alarming unless the situation is truly critical

Use:

```text
3 devices offline
```

Instead of:

```text
Something went wrong
```

Use:

```text
Database server latency elevated
```

Instead of:

```text
Performance issue detected
```

Use:

```text
Last seen 14 minutes ago
```

Instead of:

```text
Device may be unavailable
```

Avoid:

- Marketing language
- Vague system messages
- Unnecessary technical abbreviations
- Excessive exclamation marks
- Emojis
- Blame-oriented language

---

## 17. Empty, Loading, and Error States

### Loading

Show:

- Scanning progress
- Current network range
- Devices checked
- Estimated remaining time

### Empty

Examples:

- No devices match the current filters
- No active incidents
- No devices discovered in this segment
- No telemetry available yet

### Error

Error messages should explain:

1. What happened
2. What was affected
3. What the user can do next

Example:

```text
The network scan could not reach 10.0.0.0/24.
Check the scan credentials or network route, then try again.
```

---

## 18. Recommended Brand Direction

The app can use the working identity:

### Brand name

**Northstar NOC**

The name communicates:

- Direction
- Visibility
- Reliability
- Network awareness

### Visual personality

- Sea-glass operational surfaces
- Deep teal navigation
- Monospace technical values
- Restrained amber and coral alerts
- Thin topology connections
- Clear spatial hierarchy
- Minimal decorative elements

The final product should feel like a **quiet, intelligent network control room**, not a generic analytics dashboard