<?php
declare(strict_types=1);

function sf_config(): array {
    $base = [
        'openai_api_key' => '',
        'openai_model' => 'gpt-6-luna',
        'admin_password' => '',
        'fallback_message' => 'Thank you for your enquiry. Our team will get back to you shortly.',
    ];
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) {
        $v = require $local;
        if (is_array($v)) $base = array_merge($base, $v);
    }
    $base['openai_api_key'] = getenv('OPENAI_API_KEY') ?: $base['openai_api_key'];
    $base['openai_model'] = getenv('OPENAI_MODEL') ?: $base['openai_model'];
    $base['admin_password'] = getenv('SUPERFAB_CHAT_ADMIN_PASSWORD') ?: $base['admin_password'];
    return $base;
}

function sf_data_dir(): string {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    return $dir;
}

function sf_sqlite(): ?PDO {
    static $pdo = false;
    if ($pdo instanceof PDO) return $pdo;
    if ($pdo === null) return null;
    if (!extension_loaded('pdo_sqlite')) { $pdo = null; return null; }
    try {
        $pdo = new PDO('sqlite:' . sf_data_dir() . '/chat.sqlite');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('PRAGMA journal_mode=WAL;');
        $pdo->exec('CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            mobile TEXT NOT NULL,
            source_url TEXT,
            status TEXT NOT NULL DEFAULT "New",
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            source_url TEXT,
            created_at TEXT NOT NULL
        )');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id)');
        return $pdo;
    } catch (Throwable $e) {
        $pdo = null;
        return null;
    }
}

function sf_json_file(): string { return sf_data_dir() . '/chat.json'; }

function sf_json_read(): array {
    $f = sf_json_file();
    if (!is_file($f)) return ['conversations'=>[], 'messages'=>[]];
    $raw = @file_get_contents($f);
    $j = json_decode($raw ?: '', true);
    return is_array($j) ? array_merge(['conversations'=>[], 'messages'=>[]], $j) : ['conversations'=>[], 'messages'=>[]];
}

function sf_json_write(array $data): void {
    $f = sf_json_file();
    $tmp = $f . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT), LOCK_EX);
    rename($tmp, $f);
}

function sf_now(): string { return gmdate('Y-m-d H:i:s'); }

function sf_start_conversation(string $sid, string $name, string $mobile, string $url): void {
    $pdo = sf_sqlite();
    $now = sf_now();
    if ($pdo) {
        $st = $pdo->prepare('INSERT INTO conversations(session_id,name,mobile,source_url,status,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(session_id) DO UPDATE SET name=excluded.name,mobile=excluded.mobile,source_url=excluded.source_url,updated_at=excluded.updated_at');
        $st->execute([$sid,$name,$mobile,$url,'New',$now,$now]);
        return;
    }
    $d = sf_json_read();
    $found = false;
    foreach ($d['conversations'] as &$c) {
        if (($c['session_id']??'') === $sid) {
            $c['name']=$name;$c['mobile']=$mobile;$c['source_url']=$url;$c['updated_at']=$now;$found=true;break;
        }
    }
    unset($c);
    if (!$found) $d['conversations'][] = compact('sid','name','mobile') + ['session_id'=>$sid,'source_url'=>$url,'status'=>'New','created_at'=>$now,'updated_at'=>$now];
    sf_json_write($d);
}

function sf_has_conversation(string $sid): bool {
    $pdo = sf_sqlite();
    if ($pdo) {
        $st=$pdo->prepare('SELECT 1 FROM conversations WHERE session_id=? LIMIT 1');$st->execute([$sid]);
        return (bool)$st->fetchColumn();
    }
    foreach (sf_json_read()['conversations'] as $c) if (($c['session_id']??'')===$sid) return true;
    return false;
}

function sf_add_message(string $sid, string $role, string $message, string $url=''): void {
    $pdo = sf_sqlite(); $now=sf_now();
    if ($pdo) {
        $st=$pdo->prepare('INSERT INTO messages(session_id,role,message,source_url,created_at) VALUES(?,?,?,?,?)');
        $st->execute([$sid,$role,$message,$url,$now]);
        $st=$pdo->prepare('UPDATE conversations SET updated_at=? WHERE session_id=?');$st->execute([$now,$sid]);
        return;
    }
    $d=sf_json_read();$d['messages'][]=['session_id'=>$sid,'role'=>$role,'message'=>$message,'source_url'=>$url,'created_at'=>$now];
    foreach($d['conversations'] as &$c) if(($c['session_id']??'')===$sid){$c['updated_at']=$now;break;} unset($c);
    sf_json_write($d);
}

function sf_recent_messages(string $sid, int $limit=8): array {
    $pdo=sf_sqlite();
    if($pdo){
        $st=$pdo->prepare('SELECT role,message FROM messages WHERE session_id=? ORDER BY id DESC LIMIT ?');
        $st->bindValue(1,$sid);$st->bindValue(2,$limit,PDO::PARAM_INT);$st->execute();
        return array_reverse($st->fetchAll(PDO::FETCH_ASSOC));
    }
    $rows=array_values(array_filter(sf_json_read()['messages'],fn($m)=>($m['session_id']??'')===$sid));
    return array_slice($rows,-$limit);
}

function sf_words(string $s): array {
    $s = strtolower(strip_tags(html_entity_decode($s, ENT_QUOTES|ENT_HTML5, 'UTF-8')));
    preg_match_all('/[a-z0-9]{3,}/', $s, $m);
    $stop=['the','and','for','with','this','that','from','your','you','are','our','can','what','how','why','which','about','have','has','into','superfab'];
    return array_values(array_diff(array_unique($m[0]),$stop));
}

function sf_page_text(string $file): string {
    $raw=@file_get_contents($file);
    if($raw===false)return '';
    $raw=preg_replace('#<script\b[^>]*>.*?</script>#is',' ',$raw);
    $raw=preg_replace('#<style\b[^>]*>.*?</style>#is',' ',$raw);
    $text=trim(preg_replace('/\s+/',' ',strip_tags(html_entity_decode($raw,ENT_QUOTES|ENT_HTML5,'UTF-8'))));
    return $text;
}

function sf_search_site(string $question, int $maxPages=4): array {
    $root=realpath(__DIR__.'/..');
    if(!$root)return [];
    $q=sf_words($question); if(!$q)return [];
    $files=glob($root.'/*.html') ?: [];
    $scored=[];
    foreach($files as $file){
        $name=strtolower(basename($file));
        $nameWords=str_replace(['-','.html'],' ',$name);
        $raw=@file_get_contents($file);
        if($raw===false)continue;
        $hay=strtolower(strip_tags($raw));
        $score=0;
        foreach($q as $w){
            $score += substr_count($nameWords,$w)*8;
            $score += min(12,substr_count($hay,$w));
        }
        if($score>0)$scored[]=['file'=>$file,'score'=>$score];
    }
    usort($scored,fn($a,$b)=>$b['score']<=>$a['score']);
    $out=[];
    foreach(array_slice($scored,0,$maxPages) as $row){
        $text=sf_page_text($row['file']);
        $terms=$q;$bestPos=null;
        foreach($terms as $w){$p=stripos($text,$w);if($p!==false&&($bestPos===null||$p<$bestPos))$bestPos=$p;}
        $start=max(0,($bestPos??0)-900);
        $snippet=substr($text,$start,4500);
        $out[]=['title'=>basename($row['file']), 'url'=>'https://superfabinc.com/'.preg_replace('/\.html$/','',basename($row['file'])), 'score'=>$row['score'], 'text'=>$snippet];
    }
    return $out;
}

function sf_call_openai(string $question, array $knowledge, array $history): ?string {
    $cfg=sf_config(); $key=trim((string)$cfg['openai_api_key']);
    if($key==='' || !$knowledge)return null;

    $ctx='';
    foreach($knowledge as $k){
        $ctx .= "\nSOURCE: ".$k['url']."\n".$k['text']."\n";
    }
    $hist='';
    foreach($history as $h){$hist .= strtoupper($h['role']??'user').': '.($h['message']??'')."\n";}

    $instructions = "You are the website assistant for Superfab Inc. Answer ONLY using the supplied Superfab website sources. ".
      "Do not use outside/general knowledge. If the sources do not clearly contain the answer, output exactly: OUT_OF_SCOPE. ".
      "Be concise, professional and useful. Never invent prices, certifications, dimensions, stock, delivery promises, clients or technical specifications. ".
      "If asked for quotation/price, say the team can assist and ask for relevant requirement details only when supported by the site.";

    $payload=[
        'model'=>$cfg['openai_model'],
        'instructions'=>$instructions,
        'input'=>"Website sources:\n".$ctx."\nRecent chat:\n".$hist."\nCustomer question: ".$question
    ];

    $ch=curl_init('https://api.openai.com/v1/responses');
    curl_setopt_array($ch,[
        CURLOPT_POST=>true,
        CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_CONNECTTIMEOUT=>10,
        CURLOPT_TIMEOUT=>30,
        CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$key,'Content-Type: application/json'],
        CURLOPT_POSTFIELDS=>json_encode($payload,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)
    ]);
    $body=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    if($code<200||$code>=300||!$body)return null;
    $j=json_decode($body,true); if(!is_array($j))return null;
    if(isset($j['output_text'])&&is_string($j['output_text'])) return trim($j['output_text']);
    foreach(($j['output']??[]) as $o) foreach(($o['content']??[]) as $c) if(isset($c['text'])&&is_string($c['text'])) return trim($c['text']);
    return null;
}

function sf_list_conversations(): array {
    $pdo=sf_sqlite();
    if($pdo)return $pdo->query('SELECT * FROM conversations ORDER BY updated_at DESC')->fetchAll(PDO::FETCH_ASSOC);
    $d=sf_json_read()['conversations'];usort($d,fn($a,$b)=>strcmp($b['updated_at']??'',$a['updated_at']??''));return $d;
}

function sf_conversation_messages(string $sid): array {
    $pdo=sf_sqlite();
    if($pdo){$st=$pdo->prepare('SELECT * FROM messages WHERE session_id=? ORDER BY id ASC');$st->execute([$sid]);return $st->fetchAll(PDO::FETCH_ASSOC);}
    return array_values(array_filter(sf_json_read()['messages'],fn($m)=>($m['session_id']??'')===$sid));
}
