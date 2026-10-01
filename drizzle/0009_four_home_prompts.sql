-- Preserve the existing three selections; append the first available visible prompt.
UPDATE settings SET data=json_insert(data,'$.featuredPromptIds[#]',(
 SELECT json_extract(p.value,'$.id') FROM json_each(settings.data,'$.prompts') p
 WHERE json_extract(p.value,'$.visible')=1
 AND json_extract(p.value,'$.id') NOT IN (SELECT value FROM json_each(settings.data,'$.featuredPromptIds'))
 ORDER BY CAST(p.key AS INTEGER) LIMIT 1
)) WHERE id='site' AND json_array_length(data,'$.featuredPromptIds')=3
AND EXISTS (SELECT 1 FROM json_each(settings.data,'$.prompts') p WHERE json_extract(p.value,'$.visible')=1 AND json_extract(p.value,'$.id') NOT IN (SELECT value FROM json_each(settings.data,'$.featuredPromptIds')));
