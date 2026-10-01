UPDATE settings SET data=json_set(data,'$.management.showFooterAdmin',json('false')) WHERE id='site';
