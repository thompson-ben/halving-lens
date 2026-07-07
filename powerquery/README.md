# Power Query → Google Drive

Power Query (the **M** engine inside Excel and Power BI) ships **no native
Google Drive connector**. The supported way in is over Google's HTTP endpoints
with `Web.Contents`. [`GoogleDrive.pq`](./GoogleDrive.pq) wraps that into a few
reusable functions.

## Which method do I want?

| Your data on Drive is… | Use | Credentials |
| --- | --- | --- |
| A native **Google Sheet** | `GoogleSheetCsv` | none (link-shared) |
| A single **file** (CSV / XLSX / JSON) | `GoogleDriveCsv` / `GoogleDriveExcel` / `GoogleDriveJson` | none (link-shared) |
| An **entire folder** you want to enumerate | `GoogleDriveFolder` | API key (public) **or** OAuth token (private) |

## Setup

1. Excel: **Data ▸ Get Data ▸ Launch Power Query Editor**.
   Power BI: **Home ▸ Transform data**.
2. **New Source ▸ Blank Query**, then **Advanced Editor**.
3. Paste the whole of `GoogleDrive.pq`. Rename the query `GoogleDrive`.
4. Add another blank query that calls what you need.

### Read a Google Sheet tab

```m
= GoogleDrive[GoogleSheetCsv]("1AbCdEf...SpreadsheetId", "0")
```

`0` is the first tab's `gid` (find it in the sheet URL after `#gid=`).
Share the sheet as **Anyone with the link – Viewer** first.

### Read one shared file

```m
// FileId is the id in  https://drive.google.com/file/d/<FileId>/view
= GoogleDrive[GoogleDriveCsv]("1XyZ...FileId")
= GoogleDrive[GoogleDriveExcel]("1XyZ...FileId")   // returns the workbook's sheets
= GoogleDrive[GoogleDriveJson]("1XyZ...FileId")
```

Large files trigger Google's "can't scan for viruses" interstitial; the helper
detects the `confirm=` token and follows it automatically.

### List and load a whole folder

```m
// Public folder — API key. Enable the Drive API + make a key at
// console.cloud.google.com ▸ APIs & Services ▸ Credentials.
= GoogleDrive[GoogleDriveFolder]("1Fld...FolderId", "AIza...ApiKey", null)

// Private folder — OAuth access token (Bearer). Quick token:
// developers.google.com/oauthplayground with scope
//   https://www.googleapis.com/auth/drive.readonly
= GoogleDrive[GoogleDriveFolder]("1Fld...FolderId", null, "ya29....Token")
```

You get a table of `id, name, mimeType, size`. Add a column that pipes each
`id` into `GoogleDriveCsv` (or the Excel/JSON variant), then expand:

```m
let
    files = GoogleDrive[GoogleDriveFolder]("1Fld...FolderId", "AIza...ApiKey", null),
    csvs  = Table.SelectRows(files, each [mimeType] = "text/csv"),
    withData = Table.AddColumn(csvs, "Data", each GoogleDrive[GoogleDriveCsv]([id]))
in
    withData
```

## Credentials & refresh notes

- On first run Power Query asks how to authenticate the URLs. Choose
  **Anonymous** for the link-shared / API-key methods (the key travels in the
  query string). The Bearer-token method also uses **Anonymous** — the token
  is in the header the query sends.
- OAuth **access tokens expire (~1 hour)**. For unattended scheduled refresh of
  *private* Drive data you need a real OAuth flow — either a
  [custom Power Query connector](https://learn.microsoft.com/power-query/samples/)
  with OAuth2, or a service that mints a fresh token. Public API-key and
  link-shared methods refresh indefinitely with no token upkeep.
- Power BI **scheduled refresh** in the Service: set the data source privacy
  level and credentials under the dataset's settings, or the refresh will fail
  even though it works in Desktop.

## Relation to this repo

This is a standalone helper, independent of the Next.js app — handy for pulling
CSV/XLSX exports (e.g. ETF-flow sheets, on-chain snapshots) out of a shared
Drive into Excel/Power BI for ad-hoc analysis. The app's own data pipeline lives
in [`scripts/sync.ts`](../scripts/sync.ts) and reads from
`src/lib/data/snapshot.ts`; nothing here touches it.
