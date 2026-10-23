<?php
declare(strict_types=1);
require __DIR__.'/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);echo json_encode(['ok'=>false,'error'=>'Method not allowed']);exit;}
$raw=file_get_contents('php://input');
$in=json_decode($raw?:'',true);
if(!is_array($in)){http_response_code(400);echo json_encode(['ok'=>false,'error'=>'Invalid request']);exit;}

$action=(string)($in['action']??'');
$sid=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($in['session_id']??''));
$url=substr(filter_var((string)($in['source_url']??''),FILTER_SANITIZE_URL)?:'',0,700);
if(strlen($sid)<8){http_response_code(400);echo json_encode(['ok'=>false,'error'=>'Invalid session']);exit;}

if($action==='start'){
    $name=trim(strip_tags((string)($in['name']??'')));
    $mobile=preg_replace('/[^0-9+]/','',(string)($in['mobile']??''));
    if(mb_strlen($name)<2 || strlen(preg_replace('/\D/','',$mobile))<8){http_response_code(422);echo json_encode(['ok'=>false,'error'=>'Please enter valid details']);exit;}
    sf_start_conversation($sid,mb_substr($name,0,100),substr($mobile,0,20),$url);
    echo json_encode(['ok'=>true,'storage'=>sf_sqlite()?'sqlite':'json']);exit;
}

if($action==='ask'){
    if(!sf_has_conversation($sid)){http_response_code(403);echo json_encode(['ok'=>false,'error'=>'Please share your contact details first']);exit;}
    $q=trim(strip_tags((string)($in['question']??'')));
    if($q===''||mb_strlen($q)>1000){http_response_code(422);echo json_encode(['ok'=>false,'error'=>'Invalid question']);exit;}

    sf_add_message($sid,'user',$q,$url);
    $knowledge=sf_search_site($q,4);
    $reply=null;
    // Require at least a modest lexical match before asking the model.
    if($knowledge && ($knowledge[0]['score']??0)>=2){
        $reply=sf_call_openai($q,$knowledge,sf_recent_messages($sid,8));
    }
    $cfg=sf_config();
    if(!$reply || strtoupper(trim($reply))==='OUT_OF_SCOPE')$reply=$cfg['fallback_message'];
    $reply=mb_substr(trim($reply),0,1800);
    sf_add_message($sid,'assistant',$reply,$url);
    echo json_encode(['ok'=>true,'reply'=>$reply]);exit;
}

http_response_code(400);echo json_encode(['ok'=>false,'error'=>'Unknown action']);