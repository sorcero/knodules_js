/* A few global variables.  Maybe we should make these fields on Knowlet. */

var knowlets_table={};
var knowlet_nicknames={};
var knowlet_prototype={};
var knowde_prototype={};
var default_knowlet=false;

/* Knowlets, constructor, etc. */

function Knowlet(id,lang) {
  var knowlet=knowlets_table[id];
  if (knowlet) return knowlet;
  else knowlet=knowlet_nicknames[id];
  if (knowlet) return knowlet;
  // We'll ignore this, since Knowlet is often not called with 'new'
  else knowlet={};
  // The name of the knowlet
  knowlet.name=id;
  knowlets_table[id]=knowlet;
  // The prototype (which is the same as Knowlet.prototype)
  knowlet.prototype=knowlet_prototype;
  // Whether the knowlet is indexed (e.g. keeps inverse indices for
  // relations and rules)
  knowlet.indexed=true;
  // Whether to validate asserted relations
  knowlet.validate=true;
  // Whether the knowlet is 'strict' in requiring dterm references for
  // values
  knowlet.strict=false;
  // Whether the knowlet is 'finished' (all references declared)
  knowlet.finished=false;
  // Terms which are assumed unique
  knowlet.unique_terms=[];
  // The default language for this knowlet
  knowlet.lang=(((lang) && (knowlet_langs[lang])) || (lang) || "EN");
  // Mapping dterms to Knowdes (unique)
  knowlet.dterms={};
  // Mapping terms to arrays of of Knowdes (ambiguous)
  knowlet.terms={};
  // Mapping hook terms to arrays of of Knowdes (ambiguous)
  knowlet.hooks={};
  // Mapping langids to term tables
  knowlet.xterms={};
  // Mapping langids to hook tables
  knowlet.xhooks={};
  // Inverted index of GENLS and GENLS*
  knowlet.byGenls={};
  knowlet.byByAllGenls={};
  // Inverted index of antonyms, including expansion over GENLS*
  knowlet.byAntonyms={};
  knowlet.byByAllAntonyms={};
  // Maps roles to inverted indices of fillers, indicates whether a role exists
  knowlet.byRole={}; knowlet.hasRoles={};
  // Key concepts
  knowlet.key_concepts=[];
  // DRULES (disambiguation rules)
  knowlet.drules={};
  // It's own version of Knowde
  knowlet.Knowde(dterm,strict) {
    return Knowde(dterm,knowlet,(strict)||knowlet.strict);}
  return knowlet;
}
knowlet_prototype=Knowlet.prototype;
knowlet_prototype.KnowdeProbe(string,langid) {
  if (this.dterms[string]) return this.dterms[string];
  else if (this.strict) return false;
  else if ((!(langid)) || (langid===this.language))
    if ((this.terms[string]) && (this.terms[string].length===1))
      return this.terms[string][0];
    else return false;
  else if (this.xterms[langid])
    if ((this.xterms[langid][string]) &&
	(this.xterms[langid][string].length===1))
      return this.xterms[langid][string][0];
    else return false;
  else return false;
}
knowlet_prototype.KnowdeRef(string,langid) {
  var knowde=KnowdeProbe(string,((langid)||(this.language)));
  if (knowde) return knowde;
  if (this.finished)
    throw {name: 'unknown Knowde reference', irritant: string };
 else return this.Knowde(string,false);
}

/* Text processing utilities */

knowlet_prototype.quote_char="\\";

knowlet_prototype.stdspace(string)
{
  return string.replace(/\w+/," ").
    replace(/^\w/,"").replace(/\w$/,"");
}

knowlet_prototype.findBreak(string,brk,start)
{
  var pos=string.indexOf(brk,start||0);
  while (pos>0)
    if (string[pos-1]!=this.quote_char)
      return pos;
    else pos=string.indexOf(brk,pos+1);
  return pos;
}

knowlet_prototype.segmentString(string,brk,start,keepspace)
{
  var result=[]; var i=0, pos=start||0;
  var nextpos=this.findBreak(string,brk,pos);
  while (nextpos>=0) {
    if (keepspace)
      result[i++]=string.slice(pos,nextpos);
    else result[i++]=this.stdspace(string.slice(pos,nextpos));
    pos=nextpos+1;
    nextpos=this.findBreak(string,brk,pos);}
  result[i++]=string.slice(pos);
  return result;
}

knowlet_prototype.stripComments(string)
{
  return string.replace(/^\s*#.*$/g,"").
    replace(/^\s*\/\/.*$/g,"");
}

/* Knowdes */

function Knowde(dterm,knowlet,strict)
{
  if (!(knowlet))
    if (default_knowlet) knowlet=default_knowlet;
    else throw { name: "no default knowlet" };
  var knowde=knowlet.dterms[dterm];
  if (knowde) return knowde;
  else if ((!(strict)) && (!(knowlet.strict)) &&
	   (knowlet.terms[dterm]) &&
	   (knowlet.terms[dterm].length===1))
    return knowlet.terms[dterm][0];
  // We'll ignore this, since Knowde is often not called with 'new'
  else knowde={};
  knowde.prototype=knowde_prototype;
  knowde.dterm=dterm;
  knowde.dangling=true;
  knowlet.dterms[dterm]=knowde;
  // These are words which can refer (normatively or peculiarly) to this concept
  knowde.terms=new Array(dterm); knowde.hooks=[];
  // This maps langids to arrays of terms or hooks
  knwode.xterms={}; knowde.xhooks={};
  knowde.genls=[]; knowde.specls=[]; knowde.roles={}; 
  return knowde;
}
knowde_prototype=Knowde.prototype;

/* Knowde semantic relationships (getting) */

knowde_prototype.getGenls() {
  var results=[];
  function helper(g) {
    if (results.indexOf(g)) return;
    results.push(g);
    var genls=g.genls;
    var i=0; while (i<genls.length) helper(genls[i++]);}
  var genls=this.genls;
  while (i<genls.length) helper(genls[i++]);
  return results;}

knowde_prototype.getDisjoins() {
  var results=[]; var visits=[];
  function helper(g) {
    if (visits.indexOf(g)) return;
    if (g.disjoins) results=results.concat(g.disjoins);
    visits.push(g);
    var genls=g.genls;
    var i=0; while (i<genls.length) helper(genls[i++]);}
  var genls=this.genls;
  while (i<genls.length) helper(genls[i++]);
  return results;
}

knowde_prototype.getAssocs() {
  if (this.assocs) {
    var results=[];
    function helper(g) {
      if (results.indexOf(g)) return;
      results.push(g);
      var genls=g.genls;
      var i=0; while (i<genls.length) helper(genls[i++]);}
    var disjoins=this.disjoins;
    while (i<disjoins.length) helper(disjoins[i++]);
    return results;}
  else return [];
}

knowde_prototype.getExtInfo(field,langid) {
  if (!(langid)) langid=this.knowlet.language;
  if ((this.extinfo) &&
      (this.extinfo[field]) &&
      (this.extinfo[field][langid]))
    return this.extinfo[field][langid];
  else return [];
}

/* Knowde semantic relationships (testing) */

knowde_prototype.hasGenl(genl) {
  if (genl instanceof String) genl=this.knowlet.KnowdeRef(genl);
  else if (!(genl instanceof Knowde))
    throw {name: "not a Knowde", irritant: genl;}
  if (this.genls.indexOf(genl)>=0) return true;
  else if (this.knowlet.indexed)
    return ((this.knowlet.byAllGenls[genl]) &&
	    (this.knowlet.byAllGenls[genl].indexOf(this)>=0));
  var visits=[];
  function helper(g) {
    if (g.genls.indexOf(genl)>=0) return true;
    else if (visits.indexOf(g)>=0) return false;
    else {
      visits.push(g);
      var genls=g.genls;
      var i=0; while (i<genls.length)
		 if (helper(genls[i++])) return true; else {}
      return false;}}
  if (this.genls.indexOf(genl)>=0) return true;
  else {
    while (i<genls.length)
      if (helper(genls[i++])) return true; else {}
    return false;}
}

knowde_prototype.disjointFrom(disj) {
  var visits=[];
  if (disj instanceof String) genl=this.knowlet.KnowdeRef(disj);
  else if (!(disj instanceof Knowde))
    throw {name: "not a Knowde", irritant: genl;}
  if (this.disjoins.indexOf(genl)>=0) return true;
  else if (this.knowlet.indexed)
    return ((this.knowlet.byAllDisjoins[disj]) &&
	    (this.knowlet.byAllDisjoins[disj].indexOf(this)>=0));
  function helper(g) {
    if (g.disjoins.indexOf(genl)>=0) return true;
    else if (visits.indexOf(g)>=0) return false;
    else {
      visits.push(g);
      var genls=g.genls;
      var i=0; while (i<genls.length)
		 if (helper(genls[i++])) return true;
		 else {}
      return false;}}
  while (i<genls.length)
    if (helper(genls[i++])) return true; else {}
  return false;
}

/* Knowde semantic relationships (adding) */

knowde_prototype.addGenl=function (genl) {
  if (genl instanceof String) genl=this.knowlet.KnowdeRef(genl);
  else if (!(genl instanceof Knowde))
    throw {name: "not a Knowde", irritant: genl;}
  if (this.genls.indexOf(genl)) return this;
  else {
    this.dangling=false; this.genls.push(genl); genl.specls.push(this);
    if (knowlet.indexed) {
      var knowde=this, knowlet=this.knowlet;
      function indexAllGenls(g) {
	var gdterm=g.dterm;
	if (knowlet.byAllGenls[gdterm])
	  if (knowlet.byAllGenls[gdterm].indexOf(knowde)>=0)
	    return;
	  else knowlet.byAllGenls[gdterm].push(knowde);
	else knowlet.byAllGenls[gdterm]=new Array(knowde);
	var genls=g.genls; var i=0;
	while (i<genls.length) indexAllGenls(genls[i++]);}
      if (knowlet.byGenls[gdterm])
	knowlet.byGenls[gdterm].push(this);
      else knowlet.byGenls[gdterm]=new Array(this);
      if (knowlet.byGenls[gdterm])
	knowlet.byGenls[gdterm].push(this);
      else knowlet.byGenls[gdterm]=new Array(this);
      indexAllGenls(genl);}
    return knowde;}
};
knowde_prototype.addDisjoin=function (disj) {
  if (disj instanceof String) disj=this.knowlet.KnowdeRef(disj);
  else if (!(disj instanceof Knowde))
    throw {name: "not a Knowde", irritant: disj;}
  if (this.disjoins.indexOf(disj)) return this;
  else {
    this.dangling=false; this.disjoins.push(disj); disj.disjoins.push(this);
    if (this.knowlet.indexed) {
      var knowde=this, knowlet=this.knowlet, disjdterm=disj.dterm;
      function indexAllDisjoins(g) {
	var gdterm=g.dterm;
	if (knowlet.byAllDisjoins[gdterm])
	  if (knowlet.byAllDisjoins[gdterm].indexOf(knowde)>=0)
	    return;
	  else knowlet.byAllDisjoins[gdterm].push(knowde);
	else knowlet.byAllDisjoins[gdterm]=new Array(knowde);
	var genls=g.genls; var i=0;
	while (i<genls.length) indexAllDisjoins(genls[i++]);}
      if (knowlet.byDisjoins[disjdterm])
	knowlet.byGenls[disjdterm].push(this);
      else knowlet.byDisjoins[disjdterm]=new Array(this);
      if (knowlet.byDisjoins[disjdterm])
	knowlet.byDisjoins[disjdterm].push(this);
      else knowlet.byDisjoins[disjdterm]=new Array(this);
      indexAllDisjoins(disj);}
    return knowde;}
};

knowde_prototype.addAssoc=function (assoc,negative) {
  if (assoc instanceof String) assoc=this.knowlet.KnowdeRef(assoc);
  else if (!(assoc instanceof Knowde))
    throw {name: "not a Knowde", irritant: assoc;}
  if (negative) {
    if (!(this.nonassocs))
      this.non_assocs=new Array(assoc);
    else if (this.non_assocs.indexOf(assoc)) return this;
    else {
      this.non_assocs.push(assoc);
      return this;}}
  else {
    if (!(this.assocs))
      this.assocs=new Array(assoc);
    else if (this.assocs.indexOf(assoc)) return this;
    else {
      this.assocs.push(assoc);
      return this;}}
};

/* Asserting roles */

knowde_prototype.addRole=function (role,filler) {
  if (role instanceof String) role=this.knowlet.KnowdeRef(role);
  else if (!(role instanceof Knowde))
    throw {name: "not a Knowde", irritant: role;}
  if (filler instanceof String) filler=this.knowlet.KnowdeRef(role);
  else if (!(filler instanceof Knowde))
    throw {name: "not a Knowde", irritant: filler;}
  this.dangling=false;
  var rdterm=role.dterm;
  if (this.roles[rdterm])
    if (this.roles.indexOf(filler)<0)
      this.roles[rdterm].push(filler);
    else return;
  else this.roles[rdterm]=new Array(filler);
  if (role.mirror) {
    var mdterm=role.mirror.dterm;
    if (filler.roles[mdterm])
      filler.roles[mdterm].push(this);
    else filler.roles[mdterm]=new Array(this);}
  if (this.knowlet.indexed) {
    this.indexRole(role,filler);
    if (role.mirror) filler.indexRole(role.mirror,this);}
}
knowde_prototype.indexRole=function(role,filler) {
  var rdterm=role.dterm;
  var fdterm=filler.dterm;
  var knowlet=this.knowlet;
  if (knowlet.hasRoles[rdterm])
    if (knowlet.hasRoles[rdterm].indexOf(this)<0)
      knowlet.hasRoles[rdterm].push(this); else {}
  else knowlet.hasRoles[rdterm]=new Array(this);
  var role_index;
  if (knowlet.byRoles[rdterm])
    role_index=knowlet.byRoles[rdterm];
  else knowlet.byRoles[rdterm]=role_index={};
  if (role_index[fdterm])
    role_index[fdterm].push(this);
  else role_index[fdterm]=new Array(this);
}

/* Adding synonyms and hooks */

knowde_prototype.addTerm=function (term,langid) {
  if (langid) langid=knowlet_langids[langid]||langid;
  else if (this.terms.indexOf(term)) return;
  this.dangling=false;
  if ((!(langid)) || (langid===this.knowlet.language)) {
    this.terms.push(term);
    if (this.knowlet.terms[term])
      this.knowlet.terms[term].push(this);
    else this.knowlet.terms[term]=new Array(this);}
  else {
    var terms=this.xterms[langid];
    if (!(terms)) {
      this.xterms[langid]=terms={};
      terms[term]=new Array(this);}
    else if (terms[term]) terms[term].push(this);
    else terms[term]=new Array(this);}
  return this;};

knowde_prototype.addHook=function (term,langid) {
  if (langid) langid=knowlet_langids[langid]||langid;
  else if (this.hooks.indexOf(term)) return;
  this.dangling=false;
  if ((!(langid)) || (langid===this.knowlet.language)) {
    this.hooks.push(term);
    if (this.knowlet.hooks[term])
      this.knowlet.hooks[term].push(this);
    else this.knowlet.hooks[term]=new Array(this);}
  else {
    var terms=this.xhooks[langid];
    if (!(terms)) {
      this.xhooks[langid]=terms={};
      terms[term]=new Array(this);}
    else if (terms[term]) terms[term].push(this);
    else terms[term]=new Array(this);}
  return this;};

knowde_prototype.addExtInfo(type,value,langid)
{
  if (value instanceof String)
    if (value.search(/[a-zA-Z][a-zA-Z]\$/)===0) {
      langid=value.slice(0,2); value=value.slice(3);}
  if (!(langid)) langid=this.knowlet.language;
  if (!(this.ext_info)) this.ext_info={};
  if (!(this.ext_info[type])) this.ext_info[type]={};
  if (!(this.ext_info[type][langid]])
    this.ext_info[type][langid]={};
  if (this.ext_info[type][langid] instanceof Array) 
    this.ext_info[type][langid].push(value);
  else this.ext_info[type][langid]=new Array(value);
  return this;
}

/* DRULEs */

knowde_prototype.drule={};
knowde_prototype.drule.prototype=Array;
knowlet_prototype.parseDRuleElt=
  function (elt,literal) {
  if (elt==="")
    throw { name: 'InvalidDRule', irritant: arguments;}
  else if (literal) return elt;
  else if (elt[0]==="'") return elt.slice(1);
  else if (elt[0]==="\"")
    if (elt[-1]==="\"")
      return elt.slice(1,-1);
    else return elt.slice(1);
  else if (elt[0]===":")
    return this.Knowde(elt.slice(1));
  else if (this.dterms[elt]) return this.dterms[elt];
  else return elt;
}
  
  
knowlet_prototype.KnowDRule=
  function(head) {
  var drule=new Array();
  var i=0; while (i<arguments.length) {
    var arg=arguments[i++];
    if (arg instanceof String)
      drule.push(this.parseDRuleElt(arg));
    else if (arg instanceof Array) {
      var j=0; while (j<arg.length)
		 drule.push(this.parseDRuleElt(arg[j++]));}
    else throw { name: "InvalidDRule", irritant: arguments;}}
  drule.head=drule[0];
  return drule;};

/* Processing the PLAINTEXT microformat */

knowlet_prototype.handleClause(clause,subject) {
  switch (clause[0]) {
  case '^': {
    var pstart=this.findBreak("(");
    if (pstart) {
      var pend=this.findBreak(")",pstart);
      if (pend<0) {
	fdjtWarn("Invalid Knowlet clause '%s' for %s",
		 clause,subject.dterm);}
      else {
	var role=this.KnowdeRef(clause.slice(1,pstart));
	var arg=this.KnowdeRef(clause.slice(pstart+1,pend));
	arg.addRole(role,subject);
	subject.addGenl(role);}}
    else subject.addGenl(clause.slice(1));
    break;}
  case '_':
    this.KnowdeRef(clause.slice(1)).addGenl(subject); break;
  case '-':
    subject.addDisjoin(clause.slice(1));
  case '~':
    if (clause.search(/~[A-Za-z][A-Za-z]\$/)===0)
      subject.addHook(clause.slice(4),clause.slice(1,3).toLowerCase());
    else subject.addHook(clause.slice(1));
    break;
  case '&': {
    var value=clause.slice((clause[1]==="-") ? (2) : (1));
    var assoc=this.KnowdeRef(value);
    subject.addAssoc(assoc,(clause[1]==="-"));}
  case '@': 
    subject.oid=clause; break;
  case '=': {
    if (clause[1]==="@") 
      subject.addExtInfo("uri",clause.slice(2));
    else if (clause[1]==="#")
      subject.addExtInfo("tags",clause.slice(2));
    else if (clause[1]==="*") {
      subject.addExtInfo("gloss",clause.slice(2));
      subject.gloss=clause.slice(2);}
    else if (subject.gloss)
      subject.addExtInfo("gloss",clause.slice(1),
			 this.knowlet.language);
    else {
      subject.addExtInfo("gloss",clause.slice(1),
			 this.knowlet.language);
      subject.gloss=clause.slice(1);}
    break;}
  case '%': {
    var mirror=KnowdeRef(clause.slice(1));
    if (subject.mirror===mirror) break;
    else {
      var omirror=subject.mirror;
      fdjtWarn("Inconsistent mirrors for %s: +%s and -%s",
	       subject,mirror,omirror);
      omirror.mirror=false;}
    if (mirror.mirror) {
      var oinvmirror=mirror.mirror;
      fdjtWarn("Inconsistent mirrors for %s: +%s and -%s",
	       mirror,subject,oinvmirror);
      omirror.mirror=false;}
    subject.mirror=mirror; mirror.mirror=subject;}
  default: {
    var brk=this.findBreak(clause,'=');
    if (brk>0) {
      var role=this.KnowdeRef(clause.slice(0,brk));
      var filler=this.KnowdeRef(clause.slice(brk+1));
      subject.addRole(role,filler);
      filler.addGenl(role);}
    else if ((brk=this.findBreak(clause,'\&'))>0) {
      var drule=this.KnowDRule(this.segmentString(clause,'&'));
      drule.knowde=subject;
      if (subject.drules)
	subject.drules.push(drule);
      else subject.drules=new Array(drule);
      if (subject.knowlet.drules[drule.head])
	subject.knowlet.drules[drule.head].push(drule);
      else subject.knowlet.drules[drule.head]=new Array(drule);}
    else if (clause.search(/[A-Za-z][A-Za-z]\$/)===0) {
      subject.addTerm(clause.slice(3),clause.slice(0,3).toLowerCase());}
    else subject.addTerm(clause);}}
  return subject;
}

knowlet_prototype.handleSubjectEntry(entry)
{
  var clauses=this.segmentString(entry'|');
  var subject=this.Knowde(clauses[0]);
  var i=1; while (i<clauses.length)
	     this.handleClause(clauses[i++],subject);
  return subject;
}

knowlet_prototype.handleEntry(entry)
{
  switch (entry[0]) {
  case '*': {
    var subject=this.handleSubjectEntry(entry.slice(1));
    if (this.key_concepts.indexOf(subject)<0)
      this.key_concepts.push(subject);
    return subject;}
  case '-': {
    var subentries=this.segmentString(entry.slice(1),"/");
    var knowdes=[];
    var i=0; while (i<subentries.length) {
      knowdes[i]=KnowdeRef(subentries[i]); i++;}
    var j=0; while (j<knowdes.length) {
      var k=0; while (k<knowdes.length) {
	if (j!=k) knowdes[j].addDisjoin(knowdes[k]);
	k++;}
      j++;}
    return knowdes[0];}
  case '/': {
    var pos=1; var subject=false; var head=false;
    var next=this.findBreak(entry,'/',pos);
    while (true) {
      var basic_level=false;
      if (entry[pos]==='*') {basic_level=true; pos++;}
      var next_subject=
	((next) ? (this.handleSubjectEntry(entry.slice(pos,next))) :
	 (this.handleSubjectEntry(entry.slice(pos))));
      if (subject) subject.addGenl(next_subject);
      else head=next_subject;
      subject=next_subject;
      if (basic_level) subject.basic=true;
      if (next) {
	pos=next+1; next=this.findBreak(entry,"/",pos);}
      else break;}
    return head;}
  default:
    return this.handleSubjectEntry(entry);
  }
}

knowlet_prototype.handleEntries(block)
{
  if (block instanceof Array) {
    var results=[];
    var i=0; while (i<block.length) {
      results[i]=this.handleEntry(block[i]); i++;}
    return results;}
  else if (entry instanceof String)
    return this.handleEntries(this.segmentString(block.stripComments(),';'));
  else throw {name: 'TypeError', irritant: block};
}

function KnowDef(entry)
{
  if (!(default_knowlet)) {
    if ((document) && (document.location) && (document.location.url)) {
      var url=document.location.url;
      var hash=url.indexOf("#");
      if (hash>=0) url=url.slice(0,hash);
      fdjtLog("Using '%s' as the name of the default knowlet",url);
      default_knowlet=Knowlet(url);}
    else {
      fdjtLog("Making default knowlet named ''");
      default_knowlet=Knowlet("");}}
  return default_knowlet.handleEntry(entry);
}

function KnowletSetup()
{
  if ((document) && (document.getElementsByName)) {
    var elts=document.getElementsByTagName("META");
    var i=0; while (i<elts.length) {
      var elt=elts[i++];
      if (elt.name==="KNOWLET") default_knowlet=Knowlet(elt.content);}
    i=0; while (i<elts.length) {
      var elt=elts[i++];
      if (elt.name==="KNOWDEF") default_knowlet.handleEntry(elt.content);}
    elts=document.getElementsByTagName("LINK");
    i=0; while (i<elts.length) {
      var elt=elts[i++];
      if (elt.name==="KNOWLET") {
	default_knowlet.handleEntry(elt.content);}}
    elts=document.getElementsByTagName("SCRIPT");
    i=0; while (i<elts.length) {
      var elt=elts[i++];
      if (elt.language==="knowlet") {
	default_knowlet.handleEntry(elt.content);}}}
}

