CREATE TABLE load_list (
  ll_file      VARCHAR,
  ll_graph     VARCHAR,
  ll_state     INT DEFAULT 0, -- 0 not started, 1 going, 2 done
  ll_started   DATETIME,
  ll_done      DATETIME,
  ll_host      INT,
  ll_work_time INTEGER,
  ll_error     VARCHAR,
  PRIMARY KEY (ll_file))
ALTER INDEX load_list ON load_list PARTITION (ll_file VARCHAR)
;

CREATE INDEX ll_state ON load_list (ll_state, ll_file, ll_graph) PARTITION (ll_state INT)
;


CREATE TABLE ldlock (id INT PRIMARY KEY)
  ALTER INDEX ldlock ON ldlock PARTITION (id INT)
;

INSERT INTO ldlock VALUES (0);


CREATE PROCEDURE
ld_dir (IN path VARCHAR, IN mask VARCHAR, IN graph VARCHAR)
{
  DECLARE ls ANY;
  DECLARE inx INT;
  ls := sys_dirlist (path, 1);
  FOR (inx := 0; inx < LENGTH (ls); inx := inx + 1)
    {
      IF (ls[inx] LIKE mask)
  {
    SET ISOLATION = 'serializable';

    IF (NOT (EXISTS (SELECT 1 FROM DB.DBA.LOAD_LIST WHERE LL_FILE = path || '/' || ls[inx] FOR UPDATE)))
      {
        DECLARE gfile, cgfile, ngraph VARCHAR;
        gfile := path || '/' || REPLACE (ls[inx], '.gz', '') || '.graph';
        cgfile := path || '/' || regexp_replace (REPLACE (ls[inx], '.gz', ''), '\\-[0-9]+\\.n', '.n') || '.graph';
        IF (file_stat (gfile) <> 0)
    ngraph := TRIM (file_to_string (gfile), ' \r\n');
              ELSE IF (file_stat (cgfile) <> 0)
    ngraph := TRIM (file_to_string (cgfile), ' \r\n');
        ELSE IF (file_stat (path || '/' || 'global.graph') <> 0)
    ngraph := TRIM (file_to_string (path || '/' || 'global.graph'), ' \r\n');
        ELSE
          ngraph := graph;  
              IF (ngraph IS NOT NULL)
                {   
      INSERT INTO DB.DBA.LOAD_LIST (ll_file, ll_graph) VALUES (path || '/' || ls[inx], ngraph);
    }
      }

    COMMIT WORK;
  }
    }
}
;


CREATE PROCEDURE
rdf_read_dir (IN path VARCHAR, IN mask VARCHAR, IN graph VARCHAR)
{
  ld_dirr (path, mask, graph);
}
;

CREATE PROCEDURE 
ld_dir_all (IN path VARCHAR, IN mask VARCHAR, IN graph VARCHAR)
{
  DECLARE ls ANY;
  DECLARE inx INT;
  ls := sys_dirlist (path, 0);
  ld_dir (path, mask, graph);
  FOR (inx := 0; inx < LENGTH (ls); inx := inx + 1)
    {
      IF (ls[inx] <> '.' AND ls[inx] <> '..')
  {
    ld_dir_all (path||'/'||ls[inx], mask, graph);
  }
    }
}
;

CREATE PROCEDURE
ld_add (IN _fname VARCHAR, IN _graph VARCHAR)
{
  --log_message (sprintf ('ld_add: %s, %s', _fname, _graph));

  SET ISOLATION = 'serializable';

  IF (NOT (EXISTS (SELECT 1 FROM DB.DBA.LOAD_LIST WHERE LL_FILE = _fname FOR UPDATE)))
    {
      INSERT INTO DB.DBA.LOAD_LIST (LL_FILE, LL_GRAPH) VALUES (_fname, _graph);
    }
  COMMIT WORK;
}
;

CREATE PROCEDURE 
ld_ttlp_flags (IN fname VARCHAR)
{
  IF (fname LIKE '%/btc-2009%' OR fname LIKE '%.nq%' OR fname LIKE '%.n4')
    RETURN 255 + 512;
  RETURN 255;
}
;

CREATE PROCEDURE
ld_file (IN f VARCHAR, IN graph VARCHAR)
{
  DECLARE gzip_name VARCHAR;
  DECLARE exit handler FOR sqlstate '*' {
    ROLLBACK WORK;
    UPDATE DB.DBA.LOAD_LIST
      SET LL_STATE = 2,
          LL_DONE = CURDATETIME (),
          LL_ERROR = __sql_state || ' ' || __sql_message
      WHERE LL_FILE = f;
    COMMIT WORK;

    log_message (sprintf (' File %s error %s %s', f, __sql_state, __sql_message));
    RETURN;
  };

  IF (f LIKE '%.grdf' OR f LIKE '%.grdf.gz')
    {
      load_grdf (f);
    }
  ELSE IF (f LIKE '%.gz')
    {
      gzip_name := regexp_replace (f, '\.gz\x24', '');
      IF (gzip_name LIKE '%.xml' OR gzip_name LIKE '%.owl' OR gzip_name LIKE '%.rdf')
  DB.DBA.RDF_LOAD_RDFXML (gz_file_open (f), graph, graph);
      ELSE
  TTLP (gz_file_open (f), graph, graph, ld_ttlp_flags (gzip_name));
    }
  ELSE
    {
      IF (f LIKE '%.xml' OR f LIKE '%.owl' OR f LIKE '%.rdf')
  DB.DBA.RDF_LOAD_RDFXML (file_open (f), graph, graph);
      ELSE
  TTLP (file_open (f), graph, graph, ld_ttlp_flags (f));
    }

  --log_message (sprintf ('loaded %s', f));
}
;

CREATE PROCEDURE
rdf_load_dir (IN path VARCHAR,
              IN mask VARCHAR := '%.nt',
              IN graph VARCHAR := 'http://dbpedia.org')
{

  DELETE FROM DB.DBA.LOAD_LIST WHERE LL_FILE = '##stop';
  COMMIT WORK;

  ld_dir (path, mask, graph);

  rdf_loader_run ();
}
;


CREATE PROCEDURE 
ld_array ()
{
  DECLARE first, last, arr, len, local ANY;
  DECLARE cr CURSOR FOR
      SELECT TOP 100 LL_FILE, LL_GRAPH
        FROM DB.DBA.LOAD_LIST TABLE OPTION (INDEX ll_state)
        WHERE LL_STATE = 0
  FOR UPDATE;
  DECLARE fill INT;
  DECLARE f, g VARCHAR;
  DECLARE r ANY;
  WHENEVER NOT FOUND GOTO done;
  first := 0;
  last := 0;
 arr := make_array (100, 'any');
  fill := 0;
  OPEN cr;
  len := 0;
  FOR (;;)
    {
      FETCH cr INTO f, g;
      IF (0 = first) first := f;
      last := f;
      arr[fill] := VECTOR (f, g);
    len := len + CAST (file_stat (f, 1) AS INT);
      fill := fill + 1;
      IF (len > 2000000)
  GOTO done;
    }
 done:
  IF (0 = first)
    RETURN 0;
  IF (1 <> sys_stat ('cl_run_local_only')) 
    local := sys_stat ('cl_this_host');
  UPDATE load_list SET ll_state = 1, ll_started = CURDATETIME (), LL_HOST = local
    WHERE ll_file >= first AND ll_file <= last;
  RETURN arr;
}
;

CREATE PROCEDURE
rdf_loader_run (IN max_files INTEGER := NULL, IN log_enable INT := 2)
{
  DECLARE sec_delay float;
  DECLARE _f, _graph VARCHAR;
  DECLARE arr ANY;
  DECLARE xx, inx, tx_mode, ld_mode INT;
  ld_mode := log_enable;
  IF (0 = sys_stat ('cl_run_local_only'))
    {
      IF (log_enable = 2 AND cl_this_host () = 1)
  {
    cl_exec ('checkpoint_interval (0)');
    cl_exec ('__dbf_set (''cl_non_logged_write_mode'', 1)');
  }
      IF (cl_this_host () = 1)
  cl_exec('__dbf_set(''cl_max_keep_alives_missed'',3000)');
    }
  tx_mode := bit_and (1, log_enable);
  log_message ('Loader started');

  DELETE FROM DB.DBA.LOAD_LIST WHERE LL_FILE = '##stop';
  COMMIT WORK;

  WHILE (1)
    {
      SET ISOLATION = 'repeatable';
      DECLARE exit handler FOR sqlstate '40001' {
  ROLLBACK WORK;
        sec_delay := RND(1000)*0.001;
  log_message(sprintf('deadlock in loader, waiting %d milliseconds', CAST (sec_delay * 1000 AS INTEGER)));
  delay(sec_delay);
  GOTO again;
      };

     again:;

      IF (EXISTS (SELECT 1 FROM DB.DBA.LOAD_LIST WHERE LL_FILE = '##stop'))
  {
    log_message ('File load stopped by rdf_load_stop.');
    RETURN;
  }

      log_enable (tx_mode, 1);

      IF (max_files IS NOT NULL AND max_files <= 0)
        {
    COMMIT WORK;
    log_message ('Max_files reached. Finishing.');
          RETURN;
  }

      WHENEVER NOT FOUND GOTO looks_empty;

      --      log_message ('Getting next file.');
      SET ISOLATION = 'serializable';
      SELECT id INTO xx FROM ldlock WHERE id = 0 FOR UPDATE;
      arr := ld_array ();
      COMMIT WORK;
      IF (0 = arr)
  GOTO looks_empty;
      log_enable (ld_mode, 1);

      FOR (inx := 0; inx < 100; inx := inx + 1)
  {
    IF (0 = arr[inx])
      GOTO arr_done;
    ld_file (arr[inx][0], arr[inx][1]);
    UPDATE DB.DBA.LOAD_LIST SET LL_STATE = 2, LL_DONE = CURDATETIME () WHERE LL_FILE = arr[inx][0];
  }
    arr_done:
      log_enable (tx_mode, 1);


      IF (max_files IS NOT NULL) max_files := max_files - 100;

      COMMIT WORK;
    }

 looks_empty:
  COMMIT WORK;
  log_message ('No more files to load. Loader has finished,');
  RETURN;

}
;

CREATE PROCEDURE 
rdf_load_stop (IN force INT := 0)
{
  INSERT INTO DB.DBA.LOAD_LIST (LL_FILE) VALUES ('##stop');
  COMMIT WORK;
  IF (force)
    cl_exec ('txn_killall (1)');
}
;


CREATE PROCEDURE 
RDF_LOADER_RUN_1 (IN x INT, IN y INT)
{
  rdf_loader_run (x, y);
}
;

CREATE PROCEDURE 
rdf_ld_srv (IN log_enable INT)
{
  DECLARE aq ANY;
  aq := async_queue (1);
  aq_request (aq, 'DB.DBA.RDF_LOADER_RUN_1', VECTOR (NULL, log_enable));
  aq_wait_all (aq);
}
;


CREATE PROCEDURE 
load_grdf (IN f VARCHAR)
{
  DECLARE line ANY;
  DECLARE inx INT;
  DECLARE ses ANY;
  DECLARE gr VARCHAR;

  IF (f LIKE '%.gz')
    ses := gz_file_open (f);
  ELSE
    ses := file_open (f);
  inx := 0;
  line := '';
  WHILE (line <> 0)
    { 
      gr := ses_read_line (ses, 0, 0, 1);
      IF (gr = 0) RETURN;
      line := ses_read_line (ses, 0, 0, 1);
      IF (line = 0) RETURN;
      DB.DBA.RDF_LOAD_RDFXML (line, gr, gr);
      inx := inx + 1;
    }
}
;

-- cl_exec ('set lock_escalation_pct = 110');
-- cl_exec ('DB.DBA.RDF_LD_SRV (1)') &
-- cl_exec ('DB.DBA.RDF_LD_SRV (2)') &