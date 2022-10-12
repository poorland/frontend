# -*- coding:utf-8 -*-
import json

ignoreArray = []
markMap = {}

with open("../../assets/resourceMark.json", 'r') as f:
    jsonContent = json.loads(f.read())
    markMap = jsonContent['mark']

print(markMap)

for key,value in markMap.items():
    indexArray = key.split(",")
    x = int(indexArray[0])
    y = int(indexArray[1])
    for i in range(x, x + int(value["width"])):
        for j in range(y, y + int(value["height"])):
            if i == x and j == y:
                continue
            ignoreArray.append(str(i) + "," + str(j))

resultMap = {"ignore": ignoreArray}

with open("../../assets/locationIgnore.json","w") as f:
    json.dump(resultMap, f)
    print("写入完毕")

        
    