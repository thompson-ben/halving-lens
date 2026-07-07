// =============================================================================
//  GoogleDrive.pq  —  Power Query (M) helpers to pull data out of Google Drive
// -----------------------------------------------------------------------------
//  Power Query has no native Google Drive connector, so everything here goes
//  through Google's public HTTP endpoints with Web.Contents. Three real-world
//  cases are covered — pick the one that matches how your data lives on Drive:
//
//    1. GoogleSheetCsv   — a Google Sheet (native), read as CSV. No API key.
//    2. GoogleDriveFile  — a single file on Drive (CSV/XLSX/…) shared by link.
//    3. GoogleDriveFolder— list a whole folder via the Drive API, then load
//                          each file. Needs an API key (public) or OAuth token.
//
//  HOW TO USE
//  ----------
//  In Excel:   Data ▸ Get Data ▸ Launch Power Query Editor ▸ New Source ▸
//              Blank Query ▸ Advanced Editor ▸ paste one section below.
//  In Power BI:Home ▸ Transform data ▸ New Source ▸ Blank Query ▸
//              Advanced Editor ▸ paste.
//
//  Each block is a standalone query. Copy the ONE you need into its own blank
//  query, or paste the whole file into a query named `GoogleDrive` and call the
//  records like  GoogleDrive[GoogleSheetCsv]("<id>").
// =============================================================================

let
    // -------------------------------------------------------------------------
    //  1. GOOGLE SHEET  →  CSV   (simplest; no credentials for link-shared docs)
    // -------------------------------------------------------------------------
    //  Share the Sheet as "Anyone with the link – Viewer".
    //  SpreadsheetId  = the long id in the URL:
    //      https://docs.google.com/spreadsheets/d/<SpreadsheetId>/edit#gid=<Gid>
    //  Gid            = the tab's gid (0 for the first tab).
    GoogleSheetCsv = (SpreadsheetId as text, optional Gid as text) as table =>
        let
            gid = if Gid = null then "0" else Gid,
            url = "https://docs.google.com/spreadsheets/d/"
                & SpreadsheetId & "/export?format=csv&gid=" & gid,
            raw = Web.Contents(url),
            csv = Csv.Document(raw, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
            promoted = Table.PromoteHeaders(csv, [PromoteAllScalars = true])
        in
            promoted,

    // -------------------------------------------------------------------------
    //  2. SINGLE DRIVE FILE  →  binary  (CSV, XLSX, JSON, …)
    // -------------------------------------------------------------------------
    //  For a file shared "Anyone with the link". FileId is the id in the URL:
    //      https://drive.google.com/file/d/<FileId>/view
    //  Returns the raw binary — wrap it in Csv.Document / Excel.Workbook /
    //  Json.Document as appropriate (helpers below).
    //
    //  NOTE: for large files Google injects a "can't scan for viruses" HTML
    //  confirm page. This handles that by retrying with the confirm token.
    GoogleDriveFile = (FileId as text) as binary =>
        let
            base    = "https://drive.google.com/uc?export=download&id=" & FileId,
            first   = Web.Contents(base, [ManualStatusHandling = {200}]),
            asText  = try Text.FromBinary(first, 65001) otherwise "",
            // Small files come straight back; large files return an HTML page
            // containing confirm=<token>. Detect and follow it.
            isHtml  = Text.Contains(asText, "confirm="),
            token   = if isHtml
                      then Text.BetweenDelimiters(asText, "confirm=", "&")
                      else null,
            result  = if isHtml
                      then Web.Contents(base & "&confirm=" & token)
                      else first
        in
            result,

    // Convenience wrappers around GoogleDriveFile:
    GoogleDriveCsv = (FileId as text) as table =>
        Table.PromoteHeaders(
            Csv.Document(
                GoogleDriveFile(FileId),
                [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
            [PromoteAllScalars = true]),

    GoogleDriveExcel = (FileId as text) as table =>
        Excel.Workbook(GoogleDriveFile(FileId), true),

    GoogleDriveJson = (FileId as text) as any =>
        Json.Document(GoogleDriveFile(FileId)),

    // -------------------------------------------------------------------------
    //  3. WHOLE FOLDER  via the Drive API v3
    // -------------------------------------------------------------------------
    //  Lists every file in a folder, then loads each one. Handles pagination.
    //  Auth — choose ONE:
    //    • ApiKey  : works for files/folders shared publicly ("anyone with link").
    //                Get one at console.cloud.google.com ▸ APIs & Services ▸
    //                Credentials ▸ Create API key, and enable the Drive API.
    //    • Token   : an OAuth 2.0 access token (Bearer) for private files. The
    //                quick way is developers.google.com/oauthplayground with the
    //                scope  https://www.googleapis.com/auth/drive.readonly .
    //  Pass exactly one of ApiKey / Token; leave the other null.
    //
    //  FolderId = the id in the folder URL:
    //      https://drive.google.com/drive/folders/<FolderId>
    GoogleDriveFolder = (
            FolderId as text,
            optional ApiKey as nullable text,
            optional Token as nullable text
        ) as table =>
        let
            headers = if Token <> null
                      then [ #"Authorization" = "Bearer " & Token ]
                      else [],
            keyQuery = if ApiKey <> null then [ key = ApiKey ] else [],

            // One page of the file list.
            getPage = (pageToken as nullable text) as record =>
                let
                    baseQuery = [
                        q = "'" & FolderId & "' in parents and trashed = false",
                        fields = "nextPageToken, files(id, name, mimeType, size)",
                        pageSize = "1000",
                        supportsAllDrives = "true",
                        includeItemsFromAllDrives = "true"
                    ],
                    pageQuery = if pageToken <> null then [pageToken = pageToken] else [],
                    query = Record.Combine({baseQuery, keyQuery, pageQuery}),
                    resp = Json.Document(
                        Web.Contents(
                            "https://www.googleapis.com/drive/v3/files",
                            [ Query = query, Headers = headers ]))
                in
                    resp,

            // Walk all pages into one list of file records.
            gather = List.Generate(
                () => [ page = getPage(null), token = null ],
                each [page] <> null,
                each let nxt = Record.FieldOrDefault([page], "nextPageToken", null)
                     in if nxt = null then [page = null, token = null]
                        else [ page = getPage(nxt), token = nxt ],
                each Record.FieldOrDefault([page], "files", {})),

            filesList = List.Combine(List.Select(gather, each _ <> null)),
            asTable = Table.FromRecords(filesList, {"id", "name", "mimeType", "size"}, MissingField.UseNull)
        in
            asTable

in
    [
        GoogleSheetCsv   = GoogleSheetCsv,
        GoogleDriveFile  = GoogleDriveFile,
        GoogleDriveCsv   = GoogleDriveCsv,
        GoogleDriveExcel = GoogleDriveExcel,
        GoogleDriveJson  = GoogleDriveJson,
        GoogleDriveFolder= GoogleDriveFolder
    ]
