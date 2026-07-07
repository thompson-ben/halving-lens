// =============================================================================
//  GoogleDriveSharedDrive.pq
//  OAuth2 (refresh-token flow) connection to a Google *Shared Drive* folder,
//  for Power Query (Excel / Power BI).
// -----------------------------------------------------------------------------
//  This is the unattended-refresh pattern: a long-lived refresh token is
//  exchanged for a short-lived access token at run time, so scheduled refresh
//  keeps working without re-authenticating.
//
//  SECURITY — do NOT commit or share a workbook/.pbix/.pq that contains real
//  secret values. Prefer moving the four credential values into Power Query
//  Parameters (Home ▸ Manage Parameters), then reference them below.
//
//  SETUP
//    1. Fill in the four credential values (or point them at Parameters).
//    2. On first run, when prompted for credentials for both
//         https://oauth2.googleapis.com   and   https://www.googleapis.com
//       choose ANONYMOUS (the token travels in the request the query sends).
//    3. In Power BI Service, set both data sources' privacy level and set
//       auth to Anonymous, or scheduled refresh will fail.
// =============================================================================

let
    // ==== CREDENTIALS — replace the placeholders (better: use Parameters) ====
    ClientId      = "PASTE_CLIENT_ID",         // your Client ID
    ClientSecret  = "PASTE_CLIENT_SECRET",     // your Client Secret
    RefreshToken  = "PASTE_REFRESH_TOKEN",     // your Refresh Token
    SharedDriveId = "PASTE_SHARED_DRIVE_ID",   // your Shared Drive ID

    // Path to the target folder inside the shared drive. If the first segment
    // is the shared drive's own name it is detected and skipped automatically.
    FolderPath    = "POC - Private - MI - Decisions/! PBI Workspace/External Data sets",

    // ==== 1. Exchange the refresh token for a short-lived access token ====
    AccessToken =
        let
            body =
                "client_id="      & Uri.EscapeDataString(ClientId) &
                "&client_secret=" & Uri.EscapeDataString(ClientSecret) &
                "&refresh_token=" & Uri.EscapeDataString(RefreshToken) &
                "&grant_type=refresh_token",
            resp = Web.Contents("https://oauth2.googleapis.com", [
                RelativePath = "token",
                Headers      = [ #"Content-Type" = "application/x-www-form-urlencoded" ],
                Content      = Text.ToBinary(body)
            ])
        in
            Json.Document(resp)[access_token],

    Headers = [ #"Authorization" = "Bearer " & AccessToken ],

    // ==== 2. List the child items of one folder inside the shared drive ====
    //  Shared-drive listing requires corpora=drive + driveId + the AllDrives
    //  flags. Values in the Query record are URL-encoded by Power Query, so the
    //  spaces/special chars in the folder query are handled for you.
    ListChildren = (parentId as text) as list =>
        let
            fetch = (pageToken as nullable text) as record =>
                Json.Document(Web.Contents("https://www.googleapis.com", [
                    RelativePath = "drive/v3/files",
                    Headers      = Headers,
                    Query        = Record.Combine({
                        [
                            q         = "'" & parentId & "' in parents and trashed = false",
                            corpora   = "drive",
                            driveId   = SharedDriveId,
                            includeItemsFromAllDrives = "true",
                            supportsAllDrives         = "true",
                            fields    = "nextPageToken, files(id,name,mimeType,size,modifiedTime)",
                            pageSize  = "1000"
                        ],
                        if pageToken <> null then [ pageToken = pageToken ] else []
                    })
                ])),
            pages = List.Generate(
                () => [ r = fetch(null), more = true ],
                each [more],
                each let nxt = Record.FieldOrDefault([r], "nextPageToken", null)
                     in  if nxt = null then [ r = null, more = false ]
                         else [ r = fetch(nxt), more = true ],
                each Record.FieldOrDefault([r], "files", {}))
        in
            List.Combine(pages),

    // ==== 3. Resolve the folder path to a folder id ====
    DriveName = Json.Document(Web.Contents("https://www.googleapis.com", [
        RelativePath = "drive/v3/drives/" & SharedDriveId,
        Headers      = Headers,
        Query        = [ fields = "id,name" ]
    ]))[name],

    FolderId =
        let
            raw  = List.Transform(Text.Split(FolderPath, "/"), each Text.Trim(_)),
            segs0 = List.Select(raw, each _ <> ""),
            // Drop a leading segment that is the shared drive's own name.
            segs = if List.Count(segs0) > 0 and segs0{0} = DriveName
                   then List.Skip(segs0, 1) else segs0,
            resolved = List.Accumulate(segs, SharedDriveId, (parent, seg) =>
                let
                    kids   = ListChildren(parent),
                    folder = List.Select(kids, each
                                [mimeType] = "application/vnd.google-apps.folder"
                                and [name] = seg),
                    next   = if List.Count(folder) = 0
                             then error "Folder not found: '" & seg & "' under " & parent
                             else folder{0}[id]
                in
                    next)
        in
            resolved,

    // ==== 4. Files in the target folder, as a table ====
    Files  = ListChildren(FolderId),
    Result = Table.FromRecords(
                Files,
                {"id", "name", "mimeType", "size", "modifiedTime"},
                MissingField.UseNull)
in
    Result

// -----------------------------------------------------------------------------
//  LOADING FILE CONTENT
//  --------------------
//  The query above returns the folder listing. To pull a file's contents, add a
//  helper that downloads the bytes (alt=media) and wrap them per file type:
//
//    GetFileBinary = (fileId as text) as binary =>
//        Web.Contents("https://www.googleapis.com", [
//            RelativePath = "drive/v3/files/" & fileId,
//            Headers      = Headers,
//            Query        = [ alt = "media", supportsAllDrives = "true" ]
//        ]);
//
//  Then, e.g. for every CSV in the folder:
//
//    let
//        csvOnly = Table.SelectRows(Result, each [mimeType] = "text/csv"),
//        loaded  = Table.AddColumn(csvOnly, "Data", each
//            Table.PromoteHeaders(
//                Csv.Document(GetFileBinary([id]),
//                    [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
//                [PromoteAllScalars = true]))
//    in
//        loaded
//
//  For .xlsx use  Excel.Workbook(GetFileBinary([id]), true).  Note: native
//  Google Sheets have mimeType application/vnd.google-apps.spreadsheet and must
//  be EXPORTED, not downloaded — use RelativePath "drive/v3/files/<id>/export"
//  with Query [ mimeType = "text/csv", supportsAllDrives = "true" ].
//  The access token lasts ~1 hour, which covers a normal refresh.
// -----------------------------------------------------------------------------
