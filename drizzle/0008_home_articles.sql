UPDATE settings SET data=json_set(data,'$.ui.latestTitle','Yazılar','$.ui.latestLabel','','$.ui.featuredLabel','','$.management.latestCount',4) WHERE id='site';
