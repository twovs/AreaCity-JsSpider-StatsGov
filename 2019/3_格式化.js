/*
格式并且输出为csv

先加载数据
	拼音页面如果没有关闭，直接运行本代码，或者：
	先直接运行本代码，根据提示输入data-pinyin.txt到文本框 (内容太大，控制台吃不消，文本框快很多)
	或者使用本地网址更快：
	var s=document.createElement("script");s.src="https://地址/data-pinyin.txt";document.body.appendChild(s)
	
然后再次运行本代码


导入SQL Server数据库：
	导入平面文件源
		utf-8格式
		文本限定符"
		第一行为列名
		文字字段数字的设置成4/8字节有符号整数
		文本设为DT_TEXT
		表结构映射中把text类型改成ntext类型（如果文件格式是UCS-2 Lettle Endian会轻松很多）

----【检查数据源】----
--【检查id重复项，手动修正id】
select id,COUNT(id) from [ok_data - 副本] group by id having COUNT(id)>1
--【检查名称重复项，手动修正名称】
select * from [ok_data - 副本] where len(name)=1
select * from [ok_data - 副本] where name in(select name from [ok_data - 副本] group by pid,name having COUNT(*)>1) order by pid,name

----【对比新旧数据】----
--【改名】
select * from [ok_data - 副本] where exists(select * from area_city where id=[ok_data - 副本].id and ext_name<>[ok_data - 副本].ext_name) order by id
select * from area_city where exists(select * from [ok_data - 副本] where id=area_city.id and ext_name<>[area_city].ext_name) order by id
--【新增项】
select * from [ok_data - 副本] where not exists(select * from area_city where id=[ok_data - 副本].id) order by id
--【减少项】
select * from area_city where not exists(select * from [ok_data - 副本] where id=area_city.id) order by id
	
*/
"use strict";
var Max_Level=4 //1省 2市 3区 4镇

if(!$(".DataTxt").length){
	$("body").append('<div style="position: fixed;bottom: 80px;left: 100px;padding: 20px;background: #0ca;z-index:9999999">输入data-pinyin.txt<textarea class="DataTxt"></textarea></div>');
};
if(!window.CITY_LIST_PINYIN){
	var val=$(".DataTxt").val();
	if(!val){
		throw new Error("需要输入data-pinyin.txt");
	}else{
		window.CITY_LIST_PINYIN=eval(val+";CITY_LIST_PINYIN");
	};
};

var pinyinList=CITY_LIST_PINYIN;
CITY_LIST_PINYIN=null;

//添加港澳台数据
function add(txt){
	var val=txt.split("|");
	pinyinList.push({
		"id": +val[0],
		"pid": +val[1],
		"deep": +val[2],
		"name": val[3],
		"P2":  val[4],
		
		"ext_id": 0
		,"ext_name": ""
		
		,isExt:true
	});
};
//id|pid|deep|name|pinyin
add("90|0|0|港澳台|~0");
add("91|0|0|海外|~1");

add("9001|90|1|香港|xiang gang");
add("9002|90|1|澳门|ao men");
add("9003|90|1|台湾|tai wan");
add("9101|91|1|海外|hai wai");

add("900101|9001|2|香港|xiang gang");
add("900201|9002|2|澳门|ao men");
add("900301|9003|2|台湾|tai wan");
add("910101|9101|2|海外|hai wai");

add("900101001|900101|3|香港|xiang gang");
add("900201001|900201|3|澳门|ao men");
add("900301001|900301|3|台湾|tai wan");
add("910101001|910101|3|海外|hai wai");



//准备数据
var idMP={};
for(var i=0;i<pinyinList.length;i++){
	var o=pinyinList[i];
	o.child=[];
	idMP[o.id]=o;
};

var newList=[];
for(var i=0;i<pinyinList.length;i++){
	var o=pinyinList[i];
	if(o.deep+1>Max_Level){
		continue;
	};
	newList.push(o);
	
	if(o.pid){
		idMP[o.pid].child.push(o);
	};
	
	o.ext_name=o.isExt?"":(o.ext_name||o.name);
	o.name2=o.name;
	if(!o.isExt){
		if(o.ext_id==0){
			throw new Error("ext_id=0",o);
		};
	};
};
pinyinList=newList;

//人工fix数据
for(var i=0;i<pinyinList.length;i++){
	var o=pinyinList[i];
	
	//fix issues#2
	if((o.id+"").indexOf("130225")+1 && /乐[亭安]/.test(o.name)){
		o.P&&(o.P=o.P.replace(/le([\s\|]+(?:ting|an))/g,"lao$1"));
		o.P2&&(o.P2=o.P2.replace(/le([\s\|]+(?:ting|an))/g,"lao$1"));
		
		console.log("人工fix数据", "乐亭", o.name, o);
	};
};


//清理后缀
for(var i=0;i<pinyinList.length;i++){
	var o=pinyinList[i];
	
	
	var name=o.name;
	name=name.replace(/(..)(?:(?:各|汉|满|回|藏|苗|彝|壮|侗|瑶|白|傣|黎|佤|畲|水|土|羌|怒|京)族|(蒙古|维吾尔|布依|土家|哈尼|哈萨克|傈僳|高山|拉祜|东乡|纳西|景颇|柯尔克孜|达斡尔|仫佬|布朗|撒拉|毛南|仡佬|锡伯|阿昌|普米|朝鲜|塔吉克|乌孜别克|俄罗斯|鄂温克|德昂|保安|裕固|塔塔尔|独龙|鄂伦春|赫哲|门巴|珞巴|基诺)族?)+(自治[区州县旗]|(?:民族)?[乡镇])$/g,"$1");
	
	if(o.deep==0){
		name=name.replace(/(省|市|自治区)$/ig,"");
	}else if(o.deep==1){
		if(name.length>2){
			name=name.replace(/(市|区|县|盟|地区|林区)$/ig,"");
		};
	}else{
		if(o.deep==2&&/高新技术(产业)?开发区$/.test(name)){
			name="高新区";
			o.P2_2=o.P2;
			o.P2="gao xin qu";
		}else if(o.deep==2&&/高新技术(产业)?园区$/.test(name)){
			name="高新产业园";
			o.P2_2=o.P2;
			o.P2="gao xin chan ye yuan";
		}else if(o.deep==2&&/现代产业园区$/.test(name)){
			name="现代产业园";
			o.P2_2=o.P2;
			o.P2="xian dai chan ye yuan";
		}else if(o.deep==2&&/工业园区$/.test(name)){
			name="工业园区";
			o.P2_2=o.P2;
			o.P2="gong ye yuan qu";
		}else if(o.deep==2&&/经济(技术)?开发区$/.test(name)){
			name="经济开发区";
			o.P2_2=o.P2;
			o.P2="jing ji kai fa qu";
		}
		
		
		else if(/区$/.test(name)){//区结尾的太复杂单独处理
			if(o.deep==2 && (name.length==3||name.length==4)){//只处理区的	只处理34个字的			
				if(!/^市辖区$|(矿区|新区)$/.test(name)){
					name=name.replace(/区$/ig,"");
				};
			};
		}else if(name.length>2
			&& !/自治.|直属乡镇$/.test(name)){//保留XX自治X，和特例
			name=name.replace(/(..)(市|县|镇|乡|街道|街道办事处|地区办事处|社区服务中心)$/ig,"$1");
			/*
			后缀主要集中在 镇、乡、办事处、街道
select k,COUNT(*) as c from (select SUBSTRING(ext_name, len(ext_name), 1) as k from data2019) as t1 group by k order by c desc

declare @t varchar(max)='处'
select k,COUNT(*) as c from (select SUBSTRING(ext_name, len(ext_name)-LEN(@t), LEN(@t)+1) as k from data2019 where ext_name like '%'+@t) as t1 group by k order by c desc
镇	21210
乡	10198
处	5241
道	3258
区	1999
县	1453
场	1361
市	669
会	213
			*/
		};
	};
	
	
	o.minName=name;
	var pobj=idMP[o.pid];
	//简化后是否和兄弟重名
	var pcs=o.pid?pobj.child:[];
	for(var i2=0;i2<pcs.length;i2++){
		var o2=pcs[i2];
		if(o2!=o && (o2.name==name||o2.minName==name)){
			console.warn("重名",name,o.name2,o2.name2,o,o2);
			
			//两个都恢复原名，本身这种就没有多少，如果保留一个短的会有歧义
			name=o.name2;
			o.P2=o.P2_2||o.P2;
			o2.name=o2.name2;
			o2.P2=o2.P2_2||o2.P2;
		};
	};
	//简化后是否和【直接】上级重名
	if(pobj){
		//上下级是按顺序的，因为拼音前就是按顺序来push的
		if(pobj.child.length>1 && (pobj.name==name||pobj.minName==name)){
			console.warn("和上级重名",name,o.name2,pobj.name2,o,pobj);
			
			//恢复原名，这种和上级重名的蛮多，如：市下面的同名区、县
			name=o.name2;
			o.P2=o.P2_2||o.P2;
		};
	};
	
	o.name=name;
};


var FixTrim=function(name){
	return name.replace(/^\s+|\s+$/g,"");
};
function CSVName(name){
	return '"'+FixTrim(name).replace(/"/g,'""')+'"';
};

var CITY_CSV=["id,pid,deep,name,pinyin_prefix,pinyin,ext_id,ext_name"];
for(var i=0;i<pinyinList.length;i++){
	var o=pinyinList[i];
	
	//生成拼音
	var p1=FixTrim(o.P||"");
	p1=p1?p1.split("||"):[];
	var p2=FixTrim(o.P2||"");
	p2=p2?p2.split(" "):[];
	if(p1.length){
		//以本地翻译长度为准，对p2进行长度修剪
		var arr=[];
		for(var i2=0;i2<p1.length&&i2<o.name.length;i2++){
			var itm=p1[i2];
			if(itm[0]!="F"){
				arr.push(itm);
			};
		};
		p1=arr;
		
		p2.length=Math.min(p2.length,p1.length);
	}else{
		p2.length=Math.min(p2.length,o.name.length);
	};
	var ps=p2.length?p2:p1;
	var pinyin=ps.join(" ").toLowerCase();
	
	CITY_CSV.push(o.id+","+o.pid+","+o.deep+","+CSVName(o.name)
		+","+CSVName(pinyin.substr(0,1))+","+CSVName(pinyin)
		+","+CSVName(o.ext_id+"")+","+CSVName(o.ext_name+""));
};
CITY_CSV.push("");

var url=URL.createObjectURL(
	new Blob([
		new Uint8Array([0xEF,0xBB,0xBF])
		,CITY_CSV.join("\n")
	]
	,{"type":"text/plain"})
);
var downA=document.createElement("A");
downA.innerHTML="下载查询好城市的文件";
downA.href=url;
downA.download="ok_data_level"+Max_Level+".csv";
document.body.appendChild(downA);
downA.click();
